# Proxmox Hardware Sensors

Universal hardware monitoring agent for Proxmox VE.

The project provides hardware sensor detection for Proxmox hosts and is designed to work across different hardware platforms without hardcoded CPU or motherboard models.

## Features

- CPU temperature detection
- CPU frequency monitoring
- CPU load monitoring
- GPU temperature detection
- NVMe temperature detection
- Automatic sensor discovery
- Intel `coretemp` support
- AMD `k10temp` support
- AMD GPU (`amdgpu`) support
- Temperature `high` and `critical` limits
- JSON output for integration with Proxmox API and GUI

## Tested hardware

### Intel

- Intel Core i5-6500T
- Proxmox VE 9.2.x
- `coretemp`
- NVMe temperature monitoring

### AMD

- AMD PRO A10-9700E
- Proxmox VE 9.2.x
- `k10temp`
- `amdgpu`

## Agent

The main monitoring agent is:

`agent/pve-sensors`

It uses `lm-sensors` JSON output and automatically detects available hardware sensors.

The agent does not require a specific CPU model to be configured.

## Dependencies

The agent requires:

- `bash`
- `python3`
- `lm-sensors`
- `jq`

## Example output

    {
      "version": 1,
      "cpu": {
        "temperature": {
          "value": 37.0,
          "sensor": "Package id 0",
          "chip": "coretemp-isa-0000",
          "high": 84.0,
          "critical": 100.0
        },
        "frequency": 2.955,
        "load": 0.5
      },
      "gpu": [],
      "storage": []
    }

## Sensor detection

The agent currently detects:

### CPU

- Intel `coretemp`
- AMD `k10temp`
- AMD `zenpower`
- CPU frequency from `/sys/devices/system/cpu/`
- System load from `/proc/loadavg`

For CPU temperature, the agent prefers the main package temperature when available.

### GPU

Supported GPU sensor families include:

- `amdgpu`
- `radeon`
- `nouveau`
- `i915`
- `xe`

Only sensors actually detected on the system are returned.

### Storage

The agent can detect temperature sensors from devices such as:

- NVMe
- ATA/SATA drives
- HDD
- SSD
- `drivetemp`

## Design

The project is divided into separate components:

    pve-hardware-sensors/
    ├── agent/
    │   └── pve-sensors
    ├── api/
    ├── gui/
    ├── installer/
    └── README.md

The architecture is intended to keep hardware detection independent from the Proxmox GUI.

The agent produces normalized JSON data which can later be consumed by the Proxmox API and GUI components.

## Installation

Installation and automatic integration with Proxmox are currently under development.

For development/testing, the agent can be executed directly:

    ./agent/pve-sensors

or:

    bash agent/pve-sensors

## Development

The project is being developed and tested on real Proxmox VE systems with both Intel and AMD hardware.

Before installing the agent on a production system, make sure you have a backup of modified Proxmox files.

## Roadmap

- [x] Universal CPU sensor detection
- [x] Intel CPU support
- [x] AMD CPU support
- [x] GPU sensor detection
- [x] NVMe temperature detection
- [x] CPU frequency monitoring
- [x] CPU load monitoring
- [ ] Storage sensor deduplication
- [ ] Proxmox API integration
- [ ] Proxmox GUI integration
- [ ] Universal installer
- [ ] Safe update mechanism
- [ ] Uninstall/rollback support
- [ ] More hardware sensor types
- [ ] Automatic dependency installation
- [ ] Packaging

## License

To be decided.
