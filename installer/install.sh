#!/bin/bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

AGENT_SRC="$PROJECT_DIR/agent/pve-sensors"
API_SRC="$PROJECT_DIR/api/Sensors.pm"
GUI_SRC="$PROJECT_DIR/gui/sensors-panel.js"

AGENT_DST="/usr/local/bin/pve-sensors"
API_DST="/usr/share/perl5/PVE/API2/Sensors.pm"
GUI_DST="/usr/share/pve-manager/js/pvemanagerlib.js"

BACKUP_DIR="/var/backups/pve-hardware-sensors"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

MARKER="PVE_HARDWARE_SENSORS_GUI_V4"

if [[ $EUID -ne 0 ]]; then
    echo "ERROR: installer must be run as root."
    exit 1
fi

echo
echo "=========================================="
echo " Proxmox Hardware Sensors installer"
echo "=========================================="
echo

# ------------------------------------------------------------
# Check source files
# ------------------------------------------------------------

for file in "$AGENT_SRC" "$API_SRC" "$GUI_SRC"; do
    if [[ ! -f "$file" ]]; then
        echo "ERROR: missing source file:"
        echo "  $file"
        exit 1
    fi
done

# ------------------------------------------------------------
# Backup
# ------------------------------------------------------------

mkdir -p "$BACKUP_DIR"

echo "[1/7] Creating backups..."

if [[ -f "$AGENT_DST" ]]; then
    cp -a "$AGENT_DST" \
        "$BACKUP_DIR/pve-sensors.$TIMESTAMP.bak"
fi

if [[ -f "$API_DST" ]]; then
    cp -a "$API_DST" \
        "$BACKUP_DIR/Sensors.pm.$TIMESTAMP.bak"
fi

if [[ -f "$GUI_DST" ]]; then
    cp -a "$GUI_DST" \
        "$BACKUP_DIR/pvemanagerlib.js.$TIMESTAMP.bak"
fi

echo "      Backup: $BACKUP_DIR"

# ------------------------------------------------------------
# Install agent
# ------------------------------------------------------------

echo "[2/7] Installing sensor agent..."

install -m 0755 \
    "$AGENT_SRC" \
    "$AGENT_DST"

echo "      $AGENT_DST"

# ------------------------------------------------------------
# Install API
# ------------------------------------------------------------

echo "[3/7] Installing API module..."

install -m 0644 \
    "$API_SRC" \
    "$API_DST"

echo "      $API_DST"

# Register /nodes/{node}/sensors in Proxmox NodeInfo API
NODES_DST="/usr/share/perl5/PVE/API2/Nodes.pm"

if ! grep -q "PVE_HARDWARE_SENSORS_API_V1" "$NODES_DST"; then
    python3 - "$NODES_DST" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text()

use_anchor = "use PVE::API2::NodeConfig;\n"
use_addition = "use PVE::API2::Sensors;\n"

if use_anchor not in text:
    raise SystemExit("ERROR: NodeConfig use statement not found.")

if "use PVE::API2::Sensors;" not in text:
    text = text.replace(use_anchor, use_anchor + use_addition, 1)
anchor = """__PACKAGE__->register_method({
    subclass => "PVE::API2::NodeConfig",
    path => 'config',
});"""

addition = """__PACKAGE__->register_method({
    subclass => "PVE::API2::Sensors",
    path => 'sensors',
    # PVE_HARDWARE_SENSORS_API_V1
});"""

if anchor not in text:
    raise SystemExit("ERROR: NodeConfig registration anchor not found.")

if "PVE_HARDWARE_SENSORS_API_V1" in text:
    print("      Sensors API registration already present.")
else:
    text = text.replace(anchor, anchor + "\n\n" + addition, 1)
    path.write_text(text)
    print("      Sensors API registration added.")
PY
fi

# ------------------------------------------------------------
# sudoers
# ------------------------------------------------------------

echo "[4/7] Configuring smartctl permissions..."

cat > /etc/sudoers.d/pve-sensors <<'SUDOEOF'
www-data ALL=(root) NOPASSWD: /usr/sbin/smartctl
SUDOEOF

chmod 0440 /etc/sudoers.d/pve-sensors

visudo -cf /etc/sudoers.d/pve-sensors

echo "      sudoers configuration OK"

# ------------------------------------------------------------
# GUI patch
# ------------------------------------------------------------

echo "[5/7] Installing Proxmox GUI patch..."

if grep -q "$MARKER" "$GUI_DST"; then
    echo "      GUI patch already installed."
else

    python3 - "$GUI_DST" "$GUI_SRC" <<'PY'
import sys
from pathlib import Path

gui_path = Path(sys.argv[1])
patch_path = Path(sys.argv[2])

gui = gui_path.read_text()
patch = patch_path.read_text()

node_view_pos = gui.find("nodeStatus: nodeStatus")
if node_view_pos == -1:
    raise SystemExit(
        "Proxmox Node Summary nodeStatus definition was not found."
    )

container_pos = gui.find("itemId: 'itemcontainer'", node_view_pos)
if container_pos == -1:
    raise SystemExit(
        "Proxmox Node Summary itemcontainer was not found."
    )

items_pos = gui.find("items: [", container_pos)
if items_pos == -1:
    raise SystemExit(
        "Proxmox Node Summary itemcontainer items array was not found."
    )

node_status_pos = gui.find("nodeStatus,", items_pos)
if node_status_pos == -1:
    raise SystemExit(
        "Proxmox Node Summary itemcontainer nodeStatus was not found."
    )

insert_pos = node_status_pos + len("nodeStatus,")

new_gui = (
    gui[:insert_pos]
    + "\n"
    + patch.rstrip()
    + "\n"
    + gui[insert_pos:]
)

gui_path.write_text(new_gui)

print("GUI Hardware Sensors panel inserted into Node Summary.")
PY

fi

# Permissions / syntax checks
# ------------------------------------------------------------

echo "[6/7] Running checks..."

chmod 0755 "$AGENT_DST"

if ! "$AGENT_DST" >/tmp/pve-sensors-install-test.json; then
    echo "ERROR: sensor agent test failed."
    cat /tmp/pve-sensors-install-test.json 2>/dev/null || true
    exit 1
fi

if ! python3 -m json.tool \
    /tmp/pve-sensors-install-test.json \
    >/dev/null; then

    echo "ERROR: sensor agent returned invalid JSON."
    cat /tmp/pve-sensors-install-test.json
    exit 1
fi

if ! grep -q "$MARKER" "$GUI_DST"; then
    echo "ERROR: GUI marker not found after installation."
    exit 1
fi

echo "      Sensor agent OK"
echo "      JSON output OK"
echo "      GUI patch OK"

# ------------------------------------------------------------
# Restart
# ------------------------------------------------------------

echo "[7/7] Restarting pveproxy..."

systemctl restart pveproxy

sleep 2

if systemctl is-active --quiet pveproxy; then
    echo
    echo "=========================================="
    echo " Installation successful"
    echo "=========================================="
    echo
    echo "Agent:"
    echo "  $AGENT_DST"
    echo
    echo "API:"
    echo "  $API_DST"
    echo
    echo "GUI:"
    echo "  $GUI_DST"
    echo
    echo "Backup:"
    echo "  $BACKUP_DIR"
    echo
else
    echo
    echo "ERROR: pveproxy is not running!"
    systemctl status pveproxy --no-pager || true
    exit 1
fi
