/*
 * PVE_HARDWARE_SENSORS_GUI_V6
 */

{
    xtype: 'panel',
    title: gettext('Hardware Sensors'),
    bodyPadding: 8,

    html: '<div style="padding:12px;">Loading hardware sensors...</div>',

    listeners: {
        afterrender: function (panel) {

            function temperatureColor(value, high, critical) {
                if (!Ext.isNumeric(value)) {
                    return '';
                }

                if (Ext.isNumeric(critical) && value >= critical) {
                    return '#f44336';
                }

                if (Ext.isNumeric(high) && value >= high) {
                    return '#ff9800';
                }

                return '#8bc34a';
            }

            function temperatureHtml(temperature) {
                if (!temperature || !Ext.isNumeric(temperature.value)) {
                    return '<span style="color:#999;">N/A</span>';
                }

                let color = temperatureColor(
                    temperature.value,
                    temperature.high,
                    temperature.critical
                );

                return `
                    <span style="
                        color:${color};
                        font-size:18px;
                        font-weight:600;
                    ">
                        ${Number(temperature.value).toFixed(1)} °C
                    </span>
                `;
            }

            function updateSensors() {
                Proxmox.Utils.API2Request({
                    url: '/nodes/' + nodename + '/sensors',
                    method: 'GET',

                    success: function (response) {
                        let data = response.result.data || {};
                        let cpu = data.cpu || {};

                        let cpuTemp = cpu.temperature;
                        let cpuFreq = cpu.frequency;
                        let cpuLoad = cpu.load;

                        let html = `
                            <div style="
                                padding:8px 10px 12px 10px;
                                font-size:13px;
                            ">

                                <!-- CPU / GPU summary -->
                                <div style="
                                    display:grid;
                                    grid-template-columns:1fr 1fr;
                                    gap:10px;
                                    margin-bottom:14px;
                                ">

                                    <div style="
                                        border:1px solid #444;
                                        border-radius:4px;
                                        padding:12px;
                                    ">
                                        <div style="
                                            color:#bbb;
                                            font-size:13px;
                                            font-weight:600;
                                            margin-bottom:10px;
                                        ">
                                            CPU
                                        </div>

                                        <div style="margin-bottom:7px;">
                                            <span style="color:#999;">Temperature</span>
                                            <span style="float:right;">
                                                ${temperatureHtml(cpuTemp)}
                                            </span>
                                        </div>

                                        <div style="margin-bottom:7px;">
                                            <span style="color:#999;">Frequency</span>
                                            <span style="
                                                float:right;
                                                font-size:16px;
                                                font-weight:600;
                                            ">
                                                ${
                                                    Ext.isNumeric(cpuFreq)
                                                        ? Number(cpuFreq).toFixed(2) + ' GHz'
                                                        : 'N/A'
                                                }
                                            </span>
                                        </div>

                                        <div>
                                            <span style="color:#999;">Load</span>
                                            <span style="
                                                float:right;
                                                font-size:16px;
                                                font-weight:600;
                                            ">
                                                ${
                                                    Ext.isNumeric(cpuLoad)
                                                        ? (Number(cpuLoad) * 100).toFixed(0) + ' %'
                                                        : 'N/A'
                                                }
                                            </span>
                                        </div>
                                    </div>

                                    <div style="
                                        border:1px solid #444;
                                        border-radius:4px;
                                        padding:12px;
                                    ">
                                        <div style="
                                            color:#bbb;
                                            font-size:13px;
                                            font-weight:600;
                                            margin-bottom:10px;
                                        ">
                                            GPU / APU
                                        </div>
                        `;

                        if (Array.isArray(data.gpu) && data.gpu.length > 0) {
                            data.gpu.forEach(function (gpu) {
                                let gpuTemp = gpu.temperature;

                                html += `
                                    <div style="margin-bottom:8px;">
                                        <div style="
                                            color:#999;
                                            margin-bottom:3px;
                                        ">
                                            ${gpu.name || 'GPU'}
                                        </div>

                                        ${temperatureHtml(gpuTemp)}
                                    </div>
                                `;
                            });
                        } else {
                            html += `
                                <div style="
                                    color:#888;
                                    padding-top:6px;
                                ">
                                    No GPU sensor detected
                                </div>
                            `;
                        }

                        html += `
                                    </div>
                                </div>

                                <!-- Storage -->
                                <div style="
                                    color:#bbb;
                                    font-size:13px;
                                    font-weight:600;
                                    margin:4px 0 8px 2px;
                                ">
                                    Storage temperatures
                                </div>
                        `;

                        if (Array.isArray(data.storage) && data.storage.length > 0) {
                            data.storage.forEach(function (disk) {
                                let diskTemp = disk.temperature;

                                html += `
                                    <div style="
                                        border:1px solid #444;
                                        border-radius:4px;
                                        padding:9px 12px;
                                        margin-bottom:7px;
                                    ">
                                        <div style="
                                            display:flex;
                                            align-items:center;
                                            justify-content:space-between;
                                        ">
                                            <div>
                                                <div style="
                                                    font-weight:600;
                                                    font-size:14px;
                                                    margin-bottom:2px;
                                                ">
                                                    💾 ${disk.name || 'Storage'}
                                                </div>

                                                <div style="
                                                    color:#888;
                                                    font-size:11px;
                                                ">
                                                    ${disk.model || ''}
                                                </div>
                                            </div>

                                            <div>
                                                ${temperatureHtml(diskTemp)}
                                            </div>
                                        </div>
                                    </div>
                                `;
                            });
                        } else {
                            html += `
                                <div style="
                                    color:#888;
                                    padding:8px 2px;
                                ">
                                    No storage temperature sensors detected
                                </div>
                            `;
                        }

                        html += `
                            </div>
                        `;

                        panel.update(html);
                    },

                    failure: function () {
                        panel.update(`
                            <div style="
                                padding:20px;
                                color:#f44336;
                            ">
                                Unable to read hardware sensors
                            </div>
                        `);
                    },
                });

                panel.sensorRefreshTask = Ext.defer(function () {
                    if (!panel.destroyed) {
                        updateSensors();
                    }
                }, 5000);
            }

            updateSensors();
        },
    },
},
