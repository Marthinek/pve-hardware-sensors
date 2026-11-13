/*
 * PVE_HARDWARE_SENSORS_GUI_V4
 */

{
    xtype: 'panel',
    title: gettext('Hardware Sensors'),
    bodyPadding: 10,

    html: '<div style="padding:20px;">Loading hardware sensors...</div>',

    listeners: {
        afterrender: function (panel) {
            function updateSensors() {
                Proxmox.Utils.API2Request({
                url: '/nodes/' + nodename + '/sensors',
                method: 'GET',

                success: function (response) {
                    let data = response.result.data;
                    let html = '';

                    // CPU
                    let cpu = data.cpu || {};
                    let cpuTemp = cpu.temperature?.value;
                    let cpuFreq = cpu.frequency;
                    let cpuLoad = cpu.load;

                    html += `
                        <div style="margin-bottom:20px;">
                            <h3 style="margin-bottom:10px;">CPU</h3>
                            <div>
                                Temperature:
                                <strong>
                                    ${Ext.isNumeric(cpuTemp) ? Number(cpuTemp).toFixed(1) + ' °C' : 'N/A'}
                                </strong>
                            </div>
                            <div>
                                Frequency:
                                <strong>
                                    ${Ext.isNumeric(cpuFreq) ? Number(cpuFreq).toFixed(2) + ' GHz' : 'N/A'}
                                </strong>
                            </div>
                            <div>
                                Load:
                                <strong>
                                    ${Ext.isNumeric(cpuLoad) ? (Number(cpuLoad) * 100).toFixed(1) + ' %' : 'N/A'}
                                </strong>
                            </div>
                        </div>
                    `;

                    // GPU
                    html += `
                        <div style="margin-bottom:20px;">
                            <h3 style="margin-bottom:10px;">GPU</h3>
                    `;

                    if (Array.isArray(data.gpu) && data.gpu.length > 0) {
                        data.gpu.forEach(function (gpu) {
                            let gpuTemp = gpu.temperature?.value;

                            html += `
                                <div style="margin-bottom:8px;">
                                    <strong>${gpu.name || 'GPU'}</strong><br>
                                    Temperature:
                                    ${Ext.isNumeric(gpuTemp) ? Number(gpuTemp).toFixed(1) + ' °C' : 'N/A'}
                                </div>
                            `;
                        });
                    } else {
                        html += '<div>No GPU sensors detected.</div>';
                    }

                    html += '</div>';

                    // Storage
                    html += `
                        <div>
                            <h3 style="margin-bottom:10px;">Storage</h3>
                    `;

                    if (Array.isArray(data.storage) && data.storage.length > 0) {
                        data.storage.forEach(function (disk) {
                            let diskTemp = disk.temperature?.value;

                            html += `
                                <div style="margin-bottom:8px;">
                                    <strong>${disk.name || 'Storage'}</strong>
                                    ${disk.model ? ' - ' + disk.model : ''}
                                    <br>
                                    Temperature:
                                    ${Ext.isNumeric(diskTemp) ? Number(diskTemp).toFixed(1) + ' °C' : 'N/A'}
                                </div>
                            `;
                        });
                    } else {
                        html += '<div>No storage sensors detected.</div>';
                    }

                    html += '</div>';

                    panel.update(`
                        <div style="
                            padding:20px;
                            font-size:16px;
                        ">
                            ${html}
                        </div>
                    `);
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
