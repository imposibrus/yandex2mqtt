module.exports = {
    mqtt: {
        host: 'localhost',
        port: 1883,
        user: 'user',
        password: 'password',
    },

    http: {
        port: 4433,
    },

    clients: [
        {
            id: '1',
            name: 'Yandex',
            clientId: 'client',
            clientSecret: 'secret',
            isTrusted: false,
        },
    ],

    users: [
        {
            id: '1',
            username: 'admin',
            password: 'admin',
            name: 'Administrator',
        },
        {
            id: '2',
            username: 'user1',
            password: 'user1',
            name: 'User',
        },
    ],

    devices: [
        {
            id: 'haw-002-switch',
            name: 'Свет в коридоре',
            room: 'Коридор',
            type: 'devices.types.light',
            allowedUsers: ['2'],
            mqtt: [
                {
                    instance: 'on',
                    set: '/yandex/controls/light_HaW_002/on',
                    state: '/yandex/controls/light_HaW_002/on/state',
                },
            ],
            capabilities: [
                {
                    type: 'devices.capabilities.on_off',
                    retrievable: true,
                },
            ],
        },

        {
            id: 'lvr-003-switch',
            name: 'Основной свет',
            room: 'Гостиная',
            type: 'devices.types.light',
            allowedUsers: ['2'],
            mqtt: [
                {
                    instance: 'on',
                    set: '/yandex/controls/light_LvR_003/on',
                    state: '/yandex/controls/light_LvR_003/on/state',
                },
            ],
            valueMapping: [
                {
                    type: 'on_off',
                    mapping: [[false, true], [0, 1]], // [yandex, mqtt]
                },
            ],
            capabilities: [
                {
                    type: 'devices.capabilities.on_off',
                    retrievable: true,
                },
            ],
        },

        {
            id: 'lvr-001-weather',
            name: 'В гостиной',
            room: 'Гостиная',
            type: 'devices.types.sensor',
            allowedUsers: ['2'],
            mqtt: [
                {
                    instance: 'temperature',
                    state: '/yandex/sensors/LvR_001_Weather/temperature',
                },
                {
                    instance: 'humidity',
                    state: '/yandex/sensors/LvR_001_Weather/humidity',
                },
            ],
            properties: [
                {
                    type: 'devices.properties.float',
                    retrievable: true,
                    parameters: {
                        instance: 'temperature',
                        unit: 'unit.temperature.celsius',
                    },
                },
                {
                    type: 'devices.properties.float',
                    retrievable: true,
                    parameters: {
                        instance: 'humidity',
                        unit: 'unit.percent',
                    },
                },
            ],
        },

        {
            id: 'plug-001-flower',
            name: 'Розетка для цветка',
            room: 'Гостиная',
            type: 'devices.types.socket',
            allowedUsers: ['2'],
            mqtt: [
                {
                    instance: 'on',
                    set: '/yandex/controls/socket_LvR_002/on',
                    state: '/yandex/controls/socket_LvR_002/on/state',
                },
                {
                    instance: 'power',
                    state: '/yandex/controls/socket_LvR_002/power',
                },
            ],
            capabilities: [
                {
                    type: 'devices.capabilities.on_off',
                    retrievable: true,
                },
            ],
            properties: [
                {
                    type: 'devices.properties.float',
                    retrievable: true,
                    parameters: {
                        instance: 'power',
                        unit: 'unit.watt',
                    },
                },
            ],
        },
        /* --- end */
    ],
};
