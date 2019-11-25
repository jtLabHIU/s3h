/**
 * @file jtDevice: micro:bit
 *      jtDevMicrobit.js
 * @module ./jtDevice/jtDevMicrobit
 * @version 0.00.191116a
 * @author TANAHASHI, Jiro <jt@do-johodai.ac.jp>
 * @license MIT (see 'LICENSE' file)
 * @copyright (C) 2019 jtLab, Hokkaido Information University
 */
const dummy = null;
const noble = require('@abandonware/noble');
const http = require('http');
const url = require('url');
const path = require('path');
const sleep = require('./jtSleep');

const HTTP_END_POINT   = '/jtDev/microbit';
const HTTP_ACCEPT_PORT = 4989;

/**
 * GATT profile
 * @see https://www.bluetooth.com/specifications/gatt/
 * BBC micro:bit [zetit] d4464ca5e576(d4:46:4c:a5:e5:76)
 * @see https://lancaster-university.github.io/microbit-docs/resources/bluetooth/bluetooth_profile.html
 */
const _GATT_PROFILE = {
    /**
     * Bluetooth Core Specification - Service Discovery Protocol
     * @see https://www.bluetooth.com/specifications/assigned-numbers/service-discovery/
     * @see https://www.bluetooth.com/specifications/gatt/services/
     */
    sdp: {
        base: {
            uuid: '0000000000001000800000805F9B34FB',
            shortForms: true
        },
        desctiptors: {
            name: 'Client Characteristic Configuration',
            uuid: '2902',
            fields: {
                // bit0: Notifications enable/disable
                // bit1: Indications enable/disable
                'properties': '16bit'
            }
        },
        /**
         * Generic Access service 
         * - The generic_access service contains generic information about the device. All available Characteristics are readonly. 	
         */
        'genericAccess': {
            name: 'Generic Access',
            uuid: '1800',
            requirement: 'mandatory',
            characteristics: {
                /**
                 * Device Name
                 * 
                 * - Read/Write:
                 * 1. Name : utf8s 
                 */
                'deviceName': {
                    name: 'Device Name',
                    uuid: '2A00',
                    requirement: 'mandatory',
                    'read': 'mandatory',
                    'write': 'mandatory',
                    fields: {
                        'name': 'utf8s'
                    }
                },
                /**
                 * Appearance
                 * - The external appearance of this device. The values are composed of a category (10-bits) and sub-categories (6-bits).
                 * 
                 * - Read:
                 * 1. Category : 16bit 
                 */
                'appearance': {
                    name: 'Appearance',
                    uuid: '2A01',
                    requirement: 'mandatory',
                    'read': 'mandatory',
                    fields:  {
                        'category': '16bit'
                    }
                },
                /**
                 * Peripheral Preferred Connection Parameters
                 * 
                 * - Read:
                 * 1. Minimum Connection Interval : uint16
                 * 2. Maximum Connection Interval : uint16
                 * 3. Slave Latency : uint16
                 * 4. Connection Supervision Timeout Multiplier : uint16
                 */
                'peripheralPreferredConnectionParameters': {
                    name: 'Peripheral Preferred Connection Parameters',
                    uuid: '2A04',
                    requirement: 'mandatory',
                    'read': 'mandatory',
                    fields:  {
                        'connInterval_min': 'uint16',
                        'connInterval_max': 'uint16',
                        'slaveLatency':     'uint16',
                        'connTimeout':      'uint16'
                    }
                }
            }
        },
        /**
         * Generic Attribute service 
         */
        'genericAttribute': {
            name: 'Generic Attribute',
            uuid: '1801',
            requirement: 'mandatory',
            characteristics: {
                /**
                 * Service changed
                 * 
                 * - Indicate:
                 * 1. Start of Affected Attribute Handle Range : uint16
                 * 2. End of Affected Attribute Handle Range : uint16
                 * - Descriptors:
                 *  1. Client Characteristic Configuration : 2902
                 */
                'serviceChanged': {
                    name: 'Service Changed',
                    uuid: '2A05',
                    requirement: 'optional',
                    'indicate': 'mandatory',
                    fields: {
                        'attrHandleRange_start': 'uint16',
                        'attrHandleRange_end':   'uint16'
                    },
                    desctiptors: [ '2902' ]
                }
            }
        },
        /**
         * Device Information service 
         * - The Device Information Service exposes manufacturer and/or vendor information about a device.
         * - This service exposes manufacturer information about a device.
         *   The Device Information Service is instantiated as a Primary Service.
         *   Only one instance of the Device Information Service is exposed on a device.
         */
        'deviceInformation': {
            name: 'Device Information',
            uuid: '180A',
            requirement: 'mandatory',
            characteristics: {
                /**
                 * Model Number String
                 * - The value of this characteristic is a UTF-8 string representing the model number assigned by the device vendor. 
                 * 
                 * - Read:
                 * 1. Model Number : utf8s
                 */
                'modelNumberString': {
                    name: 'Model Number String',
                    uuid: '2A24',
                    requirement: 'optional',
                    'read': 'mandatory',
                    fields: {
                        'modelNumber': 'utf8s'
                    }
                },
                /**
                 * Serial Number String
                 * - The value of this characteristic is a variable-length UTF-8 string representing the serial number for a particular instance of the device. 
                 * 
                 * - Read:
                 * 1. Serial Number : utf8s
                 */
                'serialNumberString': {
                    name: 'Serial Number String',
                    uuid: '2A25',
                    requirement: 'optional',
                    'read': 'mandatory',
                    fields: {
                        'serialNumber': 'utf8s'
                    }
                },
                /**
                 * Hardware Revision String
                 * - The value of this characteristic is a UTF-8 string representing the hardware revision for the hardware within the device. 
                 * 
                 * - Read:
                 * 1. Hardware Revision : utf8s
                 */
                'hardwareRevisionString': {
                    name: 'Hardware Revision String',
                    uuid: '2A27',
                    requirement: 'optional',
                    'read': 'mandatory',
                    fields: {
                        'hardwareRevision': 'utf8s'
                    }
                },
                /**
                 * Firmware Revision String
                 * - The value of this characteristic is a UTF-8 string representing the firmware revision for the firmware within the device. 
                 * 
                 * - Read:
                 * 1. Firmware Revision : utf8s
                 */
                'firmwareRevisionString': {
                    name: 'Firmware Revision String',
                    uuid: '2A26',
                    requirement: 'optional',
                    'read': 'mandatory',
                    fields: {
                        'firmwareRevision': 'utf8s'
                    }
                },
                /**
                 * Manufacturer Name String
                 * - The value of this characteristic is a UTF-8 string representing the name of the manufacturer of the device.  
                 * 
                 * - Read:
                 * 1. Manufacturer Name : utf8s
                 */
                'manufacturerNameString': {
                    name: 'Manufacturer Name String',
                    uuid: '2A29',
                    requirement: 'mandatory',
                    'read': 'mandatory',
                    fields: {
                        type: 'utf8s'
                    }
                }
            }
        },
    },
    /**
     *  micro:bit v1.11
     */
    microbit: {
        base: {
            uuid: 'E95D0000251D470AA062FA1922DFA9A8',
            shortForms: false
        },
        /**
         * Accelerometer Service
         * - Exposes accelerometer data. An accelerometer is an electromechanical device that will measure acceleration forces.
         * - These forces may be static, like the constant force of gravity pulling at your feet,
         *   or they could be dynamic - caused by moving or vibrating the accelerometer.
         * - Value contains fields which represent 3 separate accelerometer measurements for X, Y and Z axes as 3 unsigned 16 bit values
         *   in that order and in little endian format.
         * - Data can be read on demand or notified periodically.
         */
        'accelerometer': {
            name: 'Accelerometer',
            uuid: 'E95D0753251D470AA062FA1922DFA9A8',
            requirement: 'optional',
            characteristics: {
                /**
                 * Accelerometer Data
                 * - Contains accelerometer measurements for X, Y and Z axes as 3 signed 16 bit values in that order
                 *   and in little endian format. X, Y and Z values should be divided by 1000. 
                 * 
                 * - Read/Notify:
                 * 1. Accelerometer_X : sint16
                 * 2. Accelerometer_Y : sint16
                 * 3. Accelerometer_Z : sint16
                 * - Descriptors:
                 * 1. Client Characteristic Configuration : 2902
                 */
                'accelerometerData': {
                    name: 'Accelerometer Data',
                    uuid: 'E95DCA4B251D470AA062FA1922DFA9A8',
                    requirement: 'mandatory',
                    'read': 'mandatory',
                    'notify': 'mandatory',
                    fields: {
                        'accelX': 'sint16',
                        'accelY': 'sint16',
                        'accelZ': 'sint16'
                    },
                    desctiptors: [ '2902' ]
                },
                /**
                 * Accelerometer Period
                 * - Determines the frequency with which accelerometer data is reported in milliseconds.
                 * - Valid values are 1, 2, 5, 10, 20, 80, 160 and 640.
                 * 
                 * - Read/Write:
                 * 1. Accelerometer_Period : uint16
                 */
                'accelerometerPeriod': {
                    name: 'Accelerometer Period',
                    uuid: 'E95DFB24251D470AA062FA1922DFA9A8',
                    requirement: 'mandatory',
                    'read': 'mandatory',
                    'write': 'mandatory',
                    fields: {
                        'AccelPeriod': 'uint16'
                    }
                }
            }
        },
        /**
         * Magnetometer Service
         * - Exposes magnetometer data.  A magnetometer measures a magnetic field such as the earth's magnetic field in 3 axes.
         */
        'magnetometer': {
            name: 'Magnetometer',
            uuid: 'E95DF2D8251D470AA062FA1922DFA9A8',
            requirement: 'optional',
            characteristics: {
                /**
                 * Magnetometer Data
                 * - Contains magnetometer measurements for X, Y and Z axes as 3 signed 16 bit values in that order
                 *   and in little endian format. 
                 * - Data can be read on demand or notified periodically. 
                 * 
                 * - Read/Notify:
                 * 1. Magnetometer_X : sint16
                 * 2. Magnetometer_Y : sint16
                 * 3. Magnetometer_Z : sint16
                 * - Descriptors:
                 * 1. Client Characteristic Configuration : 2902
                 */
                'magnetometerData': {
                    name: 'Magnetometer Data',
                    uuid: 'E95DFB11251D470AA062FA1922DFA9A8',
                    requirement: 'mandatory',
                    'read': 'mandatory',
                    'notify': 'mandatory',
                    fields: {
                        'magnetX': 'sint16',
                        'magnetY': 'sint16',
                        'magnetZ': 'sint16'
                    },
                    descriptions: [ '2902' ]
                },
                /**
                 * Magnetometer Period
                 * - Determines the frequency with which magnetometer data is reported in milliseconds.
                 * - Valid values are 1, 2, 5, 10, 20, 80, 160 and 640.
                 * 
                 * - Read/Write:
                 * 1. Magnetometer_Period : uint16
                 */
                'magnetometerPeriod': {
                    name: 'Magnetometer Period',
                    uuid: 'E95D386C251D470AA062FA1922DFA9A8',
                    requirement: 'mandatory',
                    'read': 'mandatory',
                    'write': 'mandatory',
                    fields: {
                        'magnetPeriod': 'uint16'
                    }
                },
                /**
                 * Magnetometer Bearing
                 * - Compass bearing in degrees from North.
                 * 
                 * - Read/Notify:
                 * 1. bearing value : uint16
                 * - Descriptors:
                 * 1. Client Characteristic Configuration : 2902
                 */
                'magnetometerBearing': {
                    name: 'Magnetometer Bearing',
                    uuid: 'E95D9715251D470AA062FA1922DFA9A8',
                    requirement: 'mandatory',
                    'read': 'mandatory',
                    'notify': 'mandatory',
                    fields: {
                        'bearing': 'uint16'
                    },
                    descriptors: [ '2902' ]
                },
                /**
                 * Magnetometer Calibration
                 * - 0 - state unknown
                 * - 1 - calibration requested
                 * - 2 - calibration completed OK
                 * - 3 - calibration completed with error
                 * 
                 * - Write/Notify:
                 * 1. calibration field : uint8
                 * - Descriptors:
                 * 1. Client Characteristic Configuration : 2902
                 */
                'magnetometerCalibration': {
                    name: 'Magnetometer Calibration',
                    uuid: 'E95DB358251D470AA062FA1922DFA9A8',
                    requirement: 'mandatory',
                    'write': 'mandatory',
                    'notify': 'mandatory',
                    fields: {
                        'caribration': 'uint8'
                    },
                    descriptors: [ '2902' ]
                }
            }
        },
        /**
         * Button Service
         * - Exposes the two Micro Bit buttons and allows 'commands' associated with button state changes
         *   to be associated with button states and notified to a connected client.
         */
        'button': {
            name: 'Button',
            uuid: 'E95D9882251D470AA062FA1922DFA9A8',
            requirement: 'optional',
            characteristics: {
                /**
                 * Button A State
                 * - State of Button A may be read on demand by a connected client
                 *   or the client may subscribe to notifications of state change.
                 * - 3 button states are defined and represented by a simple numeric enumeration:
                 *   0 = not pressed, 1 = pressed, 2 = long press.
                 * 
                 * - Read/Notify:
                 * 1. Button_State_Value : uint8
                 * - Descriptors:
                 * 1. Client Characteristic Configuration : 2902
                 */
                'buttonAState': {
                    name: 'Button A State',
                    uuid: 'E95DDA90251D470AA062FA1922DFA9A8',
                    requirement: 'mandatory',
                    'read': 'mandatory',
                    'notify': 'mandatory',
                    fields: {
                        'buttonState': 'uint8'
                    },
                    descriptors: [ '2902' ]
                },
                /**
                 * Button B State
                 * - State of Button B may be read on demand by a connected client
                 *   or the client may subscribe to notifications of state change.
                 * - 3 button states are defined and represented by a simple numeric enumeration:
                 *   0 = not pressed, 1 = pressed, 2 = long press.
                 * 
                 * - Read/Notify:
                 * 1. Button_State_Value : uint8
                 * - Descriptors:
                 * 1. Client Characteristic Configuration : 2902
                 */
                'buttonBState': {
                    name: 'Button B State',
                    uuid: 'E95DDA91251D470AA062FA1922DFA9A8',
                    requirement: 'mandatory',
                    'read': 'mandatory',
                    'notify': 'mandatory',
                    fields: {
                        'buttonState': 'uint8'
                    },
                    descriptors: [ '2902' ]
                }
            }
        },
        /**
         * IO Pin Service
         * - Provides read/write access to I/O pins, individually or collectively.
         *   Allows configuration of each pin for input/output and analogue/digital use.
         */
        'ioPin': {
            name: 'IO Pin Service',
            uuid: 'E95D127B251D470AA062FA1922DFA9A8',
            requirement: 'optional',
            characteristics: {
                /**
                 * Pin Data
                 * - Contains data relating to zero or more pins. 
                 *   Structured as a variable length array of up to 19 Pin Number / Value pairs.
                 * - Pin Number and Value are each uint8 fields.
                 * - Note however that the micro:bit has a 10 bit ADC
                 *   and so values are compressed to 8 bits with a loss of resolution.
                 * 
                 * - OPERATIONS:
                 * 
                 * - WRITE: Clients may write values to one or more pins in a single GATT write operation.
                 *   A pin to which a value is to be written must have been configured for output
                 *   using the Pin IO Configuration characteristic.
                 *   Any attempt to write to a pin which is configured for input will be ignored.
                 * 
                 * - NOTIFY: Notifications will deliver Pin Number / Value pairs for those pins
                 *   defined as input pins by the Pin IO Configuration characteristic
                 *   and whose value when read differs from the last read of the pin.
                 * 
                 * - READ: A client reading this characteristic will receive Pin Number / Value pairs for all those pins
                 *   defined as input pins by the Pin IO Configuration characteristic.
                 * 
                 * - Read/Write/Notify:
                 * 1. IO_Pin_Data : uint8[]
                 * - Descriptors:
                 * 1. Client Characteristic Configuration : 2902
                 */
                'pinData': {
                    name: 'Pin Data',
                    uuid: 'E95D8D00251D470AA062FA1922DFA9A8',
                    requirement: 'optional',
                    'read': 'mandatory',
                    'write': 'mandatory',
                    'notify': 'mandatory',
                    fields: {
                        'ioPinData': 'uint8[]'
                    },
                    descriptors: [ '2902' ]
                },
                /**
                 * Pin AD Configuration
                 * - A bit mask which allows each pin to be configured for analogue or digital use.
                 * - Bit n corresponds to pin n where 0 LESS THAN OR EQUAL TO n LESS THAN 19.
                 *   A value of 0 means digital and 1 means analogue.
                 * 
                 * - Read/Write:
                 * 1. Pin_AD_Config_Value : uint24
                 */
                'pinAdConfiguration': {
                    name: 'Pin AD Configuration',
                    uuid: 'E95D5899251D470AA062FA1922DFA9A8',
                    requirement: 'optional',
                    'read': 'mandatory',
                    'write': 'mandatory',
                    fields: {
                        'pinAdConfig': 'uint24'
                    }
                },
                /**
                 * Pin IO Configuration
                 * - A bit mask (32 bit) which defines which inputs will be read.
                 *   If the Pin AD Configuration bit mask is also set the pin will be read as an analogue input,
                 *   if not it will be read as a digital input.
                 * - Note that in practice, setting a pin's mask bit means that it will be read by the micro:bit runtime and,
                 *   if notifications have been enabled on the Pin Data characteristic,
                 *   data read will be transmitted to the connected Bluetooth peer device in a Pin Data notification.
                 *   If the pin's bit is clear, it  simply means that it will not be read by the micro:bit runtime.
                 * - Bit n corresponds to pin n where 0 LESS THAN OR EQUAL TO n LESS THAN 19.
                 *   A value of 0 means configured for output and 1 means configured for input.
                 * 
                 * - Read/Write:
                 * 1. Pin_IO_Config_Value : uint24
                 */
                'pinIoConfiguration': {
                    name: 'Pin IO Configuration',
                    uuid: 'E95DB9FE251D470AA062FA1922DFA9A8',
                    requirement: 'optional',
                    'read': 'mandatory',
                    'write': 'mandatory',
                    fields: {
                        'pinIoConfig': 'uint24'
                    }
                },
                /**
                 * PWM Control
                 * - A variable length array 1 to 2 instances of :
                 *      struct PwmControlData
                 *      {
                 *          uint8_t     pin;
                 *          uint16_t    value;
                 *          uint32_t    period;
                 *      }
                 * - Period is in microseconds and is an unsigned int but transmitted.
                 *   Value is in the range 0 – 1024, per the current DAL API (e.g. setAnalogValue). 0 means OFF.
                 * - Fields are transmitted over the air in Little Endian format.
                 * 
                 * - Write:
                 * 1. PWM Control Field : uint8[]
                 */
                'pwmControl': {
                    name: 'PWM Control',
                    uuid: 'E95DD822251D470AA062FA1922DFA9A8',
                    requirement: 'optional',
                    'write': 'mandatory',
                    fields: {
                        'pwmControl': 'uint8[]'
                    }
                }
            }
        },
        /**
         * LED Service
         * - Provides access to and control of LED state.
         *   Allows the state (ON or OFF) of all 25 LEDs to be set in a single write operation.
         * - Allows short text strings to be sent by a client for display on the LED matrix
         *   and scrolled across at a speed controlled by the Scrolling Delay characteristic.
         */
        'led': {
            name: 'LED Service',
            uuid: 'E95DD91D251D470AA062FA1922DFA9A8',
            requirement: 'optional',
            characteristics: {
                /**
                 * LED Matrix State
                 * - Allows the state of any|all LEDs in the 5x5 grid to be set to on or off
                 *   with a single GATT operation.
                 * - Consists of an array of 5 x utf8 octets, each representing one row of 5 LEDs.
                 * - Octet 0 represents the first row of LEDs
                 *   i.e. the top row when the micro:bit is viewed with the edge connector at the bottom
                 *   and USB connector at the top.
                 * - Octet 1 represents the second row and so on.
                 * - In each octet, bit 4 corresponds to the first LED in the row,
                 *   bit 3 the second and so on.
                 * - Bit values represent the state of the related LED: off (0) or on (1).
                 * 
                 * - So we have:
                 * 
                 *   Octet 0, LED Row 1: bit4 bit3 bit2 bit1 bit0
                 *   Octet 1, LED Row 2: bit4 bit3 bit2 bit1 bit0
                 *   Octet 2, LED Row 3: bit4 bit3 bit2 bit1 bit0
                 *   Octet 3, LED Row 4: bit4 bit3 bit2 bit1 bit0
                 *   Octet 4, LED Row 5: bit4 bit3 bit2 bit1 bit0
                 * 
                 * - Read/Write:
                 * 1. LED_Matrix_State : uint8[]
                 */
                'ledMatrixState': {
                    name: 'LED Matrix State',
                    uuid: 'E95D7B77251D470AA062FA1922DFA9A8',
                    requirement: 'mandatory',
                    'read': 'mandatory',
                    'write': 'mandatory',
                    fields: {
                        'ledMatrixState': 'uint8[]'
                    }
                },
                /**
                 * LED Text
                 * - A short UTF-8 string to be shown on the LED display.
                 *   Maximum length 20 octets.
                 * 
                 * - Write:
                 * 1. LED_Text_Value : utf8s
                 */
                'ledText': {
                    name: 'LED Text',
                    uuid: 'E95D93EE251D470AA062FA1922DFA9A8',
                    requirement: 'mandatory',
                    'write': 'mandatory',
                    fields: {
                        'ledText': 'utf8s'
                    }
                },
                /**
                 * Scrolling Delay
                 * - Specifies a millisecond delay to wait for in between showing each character on the display.
                 * 
                 * - Read/Write:
                 * 1. Scrolling_Delay_Value : uint16
                 */
                'scrollingDelay': {
                    name: 'Scrolling Delay',
                    uuid: 'E95D0D2D251D470AA062FA1922DFA9A8',
                    requirement: 'mandatory',
                    'read': 'mandatory',
                    'write': 'mandatory',
                    fields: {
                        'scrollingDelay': 'uint16'
                    }
                }
            }
        },
        /**
         * Event Service
         * - A generic, bi-directional event communication service.
         * 
         * - The Event Service allows events or commands to be notified to the micro:bit
         *   by a connected client and it allows micro:bit to notify the connected client
         *   of events or commands originating from with the micro:bit.
         *   The micro:bit can inform the client of the types of event
         *   it is interested in being informed about (e.g. an incoming call)
         *   and the client can inform the micro:bit of types of event
         *   it wants to be notified about.
         * 
         * - The term “event” will be used here for both event and command types of data.
         * - Events may have an associated value.
         * - Note that specific event ID values including any special values
         *   such as those which may represent wild cards are not defined here.
         *   The micro:bit run time documentation should be consulted for this information.
         * 
         * - Multiple events of different types may be notified to the client
         *   or micro:bit at the same time.
         * - Event data is encoded as an array of structs each encoding an event of a given type together
         *   with an associated value.
         * - Event Type and Event Value are both defined as uint16
         *   and therefore the length of this array will always be a multiple of 4.
         * 
         *   struct event {
         *       uint16 event_type;
         *       uint16 event_value;
         *   };
         */
        'event': {
            name: 'Event Service',
            uuid: 'E95D93AF251D470AA062FA1922DFA9A8',
            requirement: 'optional',
            characteristics: {
                /**
                 * MicroBit Requirements
                 * - A variable length list of event data structures
                 *   which indicates the types of client event,
                 *   potentially with a specific value
                 *   which the micro:bit wishes to be informed of when they occur.
                 * - The client should read this characteristic
                 *   when it first connects to the micro:bit.
                 * - It may also subscribe to notifications to that it can be informed
                 *   if the value of this characteristic is changed by the micro:bit firmware.
                 * 
                 *      struct event {
                 *          uint16 event_type;
                 *          uint16 event_value;
                 *      };
                 * 
                 * - Note that an event_type of zero means ANY event type
                 *   and an event_value part set to zero means ANY event value.
                 * - event_type and event_value are each encoded in little endian format.
                 * 
                 * - Read/Notify:
                 * 1. microbit_reqs_value : uint8[]
                 * - Descriptors:
                 * 1. Client Characteristic Configuration : 2902
                 */
                'microbitRequirements': {
                    name: 'MicroBit Requirements',
                    uuid: 'E95DB84C251D470AA062FA1922DFA9A8',
                    requirement: 'mandatory',
                    'read': 'mandatory',
                    'notify': 'mandatory',
                    fields: {
                        'microbitReqs': 'uint8[]'
                    },
                    descriptors: [ '2902' ]
                },
                /**
                 * MicroBit Event
                 * - Contains one or more event structures which should be notified to the client.
                 *   It supports notifications and as such the client should subscribe
                 *   to notifications from this characteristic.
                 * 
                 *      struct event {
                 *          uint16 event_type;
                 *          uint16 event_value;
                 *      };
                 *
                 * 
                 * - Read/Notify:
                 * 1. Event_Type_And_Value : uint8[]
                 * - Descriptors:
                 * 1. Client Characteristic Configuration : 2902
                 */
                'microbitEvent': {
                    name: 'MicroBit Event',
                    uuid: 'E95D9775251D470AA062FA1922DFA9A8',
                    requirement: 'mandatory',
                    'read': 'mandatory',
                    'notify': 'mandatory',
                    fields: {
                        'event': 'uint8[]'
                    },
                    descriptors: [ '2902' ]
                },
                /**
                 * Client Requirements
                 * - a variable length list of event data structures
                 *   which indicates the types of micro:bit event,
                 *   potentially with a specific value
                 *   which the client wishes to be informed of when they occur.
                 * - The client should write to this characteristic when it first connects to the micro:bit.
                 * 
                 *      struct event {
                 *          uint16 event_type;
                 *          uint16 event_value;
                 *      };
                 *
                 * - Note that an event_type of zero means ANY event type
                 *   and an event_value part set to zero means ANY event value.
                 * - event_type and event_value are each encoded in little endian format.
                 * 
                 * - Write:
                 * 1. Client_Requirements_Value : uint8[]
                 */
                'clientRequirements': {
                    name: 'Client Requirements',
                    uuid: 'E95D23C4251D470AA062FA1922DFA9A8',
                    requirement: 'mandatory',
                    'write': 'mandatory',
                    fields: {
                        'clientRequirements': 'uint8[]'
                    }
                },
                /**
                 * Client Event
                 * - a writable characteristic which the client may write one or more event structures to,
                 *   to inform the micro:bit of events which have occurred on the client.
                 * - These should be of types indicated in the micro:bit Requirements characteristic bit mask.
                 * 
                 *      struct event {
                 *          uint16 event_type;
                 *          uint16 event_value;
                 *      };
                 * 
                 * - Write/Write Without Response:
                 * 1. Event_Types_And_Values : uint8[]
                 */
                'clientEvent': {
                    name: 'Client Event',
                    uuid: 'E95D5404251D470AA062FA1922DFA9A8',
                    requirement: 'mandatory',
                    'write': 'mandatory',
                    'writeWithoutResponse': 'mandatory',
                    fields: {
                        'event': 'uint8[]'
                    }
                }
            }
        },
        /**
         * DFU Control Service
         * - Allows clients to initiate the micro:bit pairing and over the air firmware update procedures.
         */
        'dfuControl': {
            name: 'DFU Control Service',
            uuid: 'E95D93B0251D470AA062FA1922DFA9A8',
            requirement: 'mandatory',
            characteristics: {
                /**
                 * DFU Control
                 * - Writing 0x01 initiates rebooting the micro:bit
                 *   into the Nordic Semiconductor bootloader
                 *   if the DFU Flash Code characteristic has been written
                 *   to with the correct secret key.
                 * - Writing 0x02 to this characteristic  means "request flash code".
                 * 
                 * - Read/Write:
                 * 1. dfu_control : uint8
                 */
                'dfuControl': {
                    name: 'DFU Control',
                    uuid: 'E95D93B1251D470AA062FA1922DFA9A8',
                    requirement: 'mandatory',
                    'read': 'mandatory',
                    'write': 'mandatory',
                    fields: {
                        'dfuControl': 'uint8'                        
                    }
                }
            }
        },
        /**
         * Temperature Service
         * - Ambient temperature derived from several internal temperature sensors on the micro:bit
         */
        'temperature': {
            name: 'Temperature Service',
            uuid: 'E95D6100251D470AA062FA1922DFA9A8',
            requirement: 'optional',
            characteristics: {
                /**
                 * Temperature
                 * - Signed integer 8 bit value in degrees celsius.
                 * 
                 * - Read/Notify:
                 * 1. temperature value : sint8
                 */
                'temperature': {
                    name: 'Temperature',
                    uuid: 'E95D9250251D470AA062FA1922DFA9A8',
                    requirement: 'mandatory',
                    'read': 'mandatory',
                    'notify': 'mandatory',
                    fields: {
                        'temperatrure': 'sint8'
                    }
                },
                /**
                 * Temperature Period
                 * - Determines the frequency with which temperature data is updated in milliseconds.
                 * 
                 * - Read/Write:
                 * 1. temperature period value : uint16
                 */
                'temperaturePeriod': {
                    name: 'Temperature Period',
                    uuid: 'E95D1B25251D470AA062FA1922DFA9A8',
                    requirement: 'mandatory',
                    'read': 'mandatory',
                    'write': 'mandatory',
                    fields: {
                        'temperaturePeriod': 'uint16'
                    }
                }
            }
        },
        /**
         * UART Service
         * - This is an implementation of Nordic Semicondutor's UART/Serial Port Emulation
         *   over Bluetooth low energy.
         * @see https://developer.nordicsemi.com/nRF5_SDK/nRF51_SDK_v8.x.x/doc/8.0.0/s110/html/a00072.html
         *   for the original Nordic Semiconductor documentation by way of background.
         */
        'uart': {
            name: 'UART Service',
            uuid: '6E400001B5A3F393E0A9E50E24DCCA9E',
            requirement: 'mandatory',
            characteristics: {
                /**
                 * TX Characteristic
                 * - This characteristic allows the micro:bit to transmit a byte array
                 *   containing an arbitrary number of arbitrary octet values to a connected device. 
                 * - The maximum number of bytes which may be transmitted in one PDU
                 *   is limited to the MTU minus three or 20 octets to be precise.
                 * 
                 * - Indicate:
                 * 1. UART TX Field : uint8[]

                 */
                name: 'TX Characteristic',
                uuid: '6E400002B5A3F393E0A9E50E24DCCA9E',
                requirement: 'mandatory',
                'indicate': 'mandatory',
                fields: {
                    'uartTx': 'uint8[]'
                },
                /**
                 * RX Characteristic
                 * - This characteristic allows a connected client to send a byte array
                 *   containing an arbitrary number of arbitrary octet values to a connected micro:bit. 
                 * - The maximum number of bytes which may be transmitted in one PDU
                 *   is limited to the MTU minus three or 20 octets to be precise.
                 * 
                 * - Write/Write Without Response:
                 * 1. UART TX Field : uint8[]   - "TX" is maybe typo, "RX" is more correct
                 */
                name: 'RX Characteristic',
                uuid: '6E400003B5A3F393E0A9E50E24DCCA9E',
                requirement: 'mandatory',
                'write': 'mandatory',
                'writeWithoutResponse': 'mandatory',
                fields: {
                    'uartRx': 'uint8[]'
                }
            }
        }
    }
}

class jtDevMicrobit{
    constructor(){
        this._target = null;
        this._services = {};
        this._characteristics = {};
        this._data = {};
        this._http = http.createServer( (request, response) => {
            this._httpServer(request, response);
        });
        this._http.listen(HTTP_ACCEPT_PORT);

        let ready = false;
        sleep.waitPromise(5000, 100, resolve => {
            resolve(noble.state === 'poweredOn');
        })
        .then( ready => {
            if(ready){
                noble.on('stateChange', state => {this._onStateChange(state)});
                noble.on('warning', message => {this._onWarning(message)});
                noble.on('discover', peripheral => {this._onDiscover(peripheral)});
                noble.startScanning();
                console.log('noble ready.');
            } else {
                console.log("BLE adaptor can't initialize.");
            }
        })
        .catch( e => {
            console.log(e);
            console.log("noble can't initialize.");
        });
    }

    static get GATT_PROFILE(){
        return _GATT_PROFILE;
    }

    _onStateChange(state){
        console.log('onStateChange:', state);
    }

    _onWarninge(message){
        console.log('onWarning:', message);
    }

    _onDiscover(peripheral){
        const name = String(peripheral.advertisement.localName);
        if(name.indexOf('BBC micro:bit') >= 0){
            noble.stopScanning();
            this._target = peripheral;
            this._target.name = peripheral.advertisement.localName;
            console.log(`target found: ${this._target.name} (${this._target.address})`);
            this._target.on('servicesDiscover', services => { this._onServicesDiscover(services) });
            this._target.on('connect', () => { this._target.discoverServices() });
            this._target.connect();
        }
    }

    _onServicesDiscover(services){
        services.forEach( service => {
            for(const profile in jtDevMicrobit.GATT_PROFILE){
                if(jtDevMicrobit.GATT_PROFILE.hasOwnProperty(profile)) {
                    const element = jtDevMicrobit.GATT_PROFILE[profile];
                    if(element.hasOwnProperty('service')){
                        if(service.uuid == element.service.toLowerCase()){
                            this._services[profile] = service;
                            //console.log(`service found: ${profile}`);
                            this._services[profile].on('characteristicsDiscover', characteristics => {
                                this._onCharacteristicsDiscover(characteristics, element);
                            });
                            this._services[profile].discoverCharacteristics();
                        }
                    }
                }
            }
        });
    }

    _onCharacteristicsDiscover(characteristics, element){
        characteristics.forEach( characteristic => {
            for(const profile in element.characteristics){
                if(element.characteristics.hasOwnProperty(profile)) {
                    const uuid = element.characteristics[profile];
                    if(characteristic.uuid == uuid.toLowerCase()){
                        this._characteristics[profile] = characteristic;
                        this._characteristics[profile].ready = false;
                        this._data[profile] = {};
                        this._data[profile].ready = false;
                        console.log(`characteristic found: ${profile}`);
                    }
                }
            }
        });
    }

    async _httpServer(request, response){
        console.log('http reauest incoming');
        const requestUrl = url.parse(request.url, true);
        const endpoint = path.dirname(requestUrl.pathname);
        const method = path.basename(requestUrl.pathname);
        if( request.method == 'GET' && endpoint == HTTP_END_POINT){
                response.writeHead(200, 'OK', {
                    'Content-Type': 'text/plain',
                    'Access-Control-Allow-Origin': '*'
                });
                const result = await this.read('magnetometerBearing');
                const degree = result[0] + result[1]*256;
                response.write(String(degree)); 
                response.end();
        }
    }

    async read(characteristic){
        if(this._characteristics.hasOwnProperty(characteristic)){
            return new Promise( (resolve, reject) => {
                this._characteristics[characteristic].read( (error, data) => {
                    if(error){
                        reject(error);
                    }else{
                        resolve(data);
                    }
                });
            }).then( result => {
                return result;
            }).catch( error => {
                throw error;
            });
        }else{
            return -4989;
        }
    }

    async write(characteristic, data){
        if(this._characteristics.hasOwnProperty(characteristic)){
            return new Promise( (resolve, reject) => {
                this._characteristics[characteristic].write(data, false, error => {
                    if(error){
                        reject(error);
                    }else{
                        resolve();
                    }
                });
            }).then( () => {
                return 0;
            }).catch( error => {
                throw error;
            });
        }else{
            return -4989;
        }
    }

    async getNotify(characteristic){
        if(this._characteristics.hasOwnProperty(characteristic)){
            if(!this._characteristics[characteristic].ready){
                this._characteristics[characteristic].on('data', (data, isNotification) => {
                    this._data[characteristic].rawValue = data;
                    this._data[characteristic].isNotification = isNotification;
                    this._data[characteristic].ready = true;
                });
                this._characteristics[characteristic].subscribe( error => {
                    if(error){
                        console.log(`${characteristic}: subscribe error:`, error);
                    }else{
                        this._characteristics[characteristic].ready = true;
                    }
                });
                await sleep.wait(5000, 1, async ()=>{return this._characteristics[characteristic].ready});
            }
            const ready = await sleep.wait(100, 1, async ()=>{return this._data[characteristic].ready});
            if(ready){
                const result = this._data[characteristic].rawValue;
                this._data[characteristic].ready = false;
                return result;
            }else{
                return -1;
            }
        }else{
            return -4989;
        }
    }
}

module.exports = jtDevMicrobit;

async function test(){
    const microbit = new jtDevMicrobit();
    while(true){
        const result = await microbit.read('magnetometerBearing');
        const degree = result[0] + result[1]*256;
        console.log(degree);
//        if((status != 1) && (status != 2)){    // calibration not requested and calibration not completed ok
//            const request = await microbit.write('magnetometerCalibration', Buffer.from([1]));
//            console.log('calibration request:', request);
//        }
//        const result = await microbit.read('buttonAState');
        await sleep(500);
    }
}
test();
