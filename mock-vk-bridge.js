// mock-vk-bridge.js
// This file creates a mock version of VK Bridge for local testing

// Create mock VK Bridge object if it doesn't exist
if (typeof window.vkBridge === 'undefined') {
    window.vkBridge = {
        send: function(method, params) {
            console.log(`VK Bridge mock: Called method "${method}" with params:`, params);
            
            // Return a promise that resolves with mock data
            return new Promise((resolve) => {
                switch (method) {
                    case 'VKWebAppInit':
                        console.log('VK Bridge mock: App initialized');
                        resolve({ result: true });
                        break;
                    
                    case 'VKWebAppGetUserInfo':
                        resolve({
                            id: 12345,
                            first_name: 'Test',
                            last_name: 'User',
                            photo_100: 'https://vk.com/images/camera_100.png'
                        });
                        break;
                    
                    // Add more mock responses for other VK Bridge methods as needed
                    
                    default:
                        console.log(`VK Bridge mock: No mock implementation for method "${method}"`);
                        resolve({ result: true });
                }
            });
        },
        subscribe: function(handler) {
            console.log('VK Bridge mock: Subscribed to events');
            // Store the handler if needed for testing
            window.vkBridgeEventHandler = handler;
        },
        unsubscribe: function(handler) {
            console.log('VK Bridge mock: Unsubscribed from events');
            if (window.vkBridgeEventHandler === handler) {
                window.vkBridgeEventHandler = null;
            }
        }
    };
}

// Create a global vkBridge object for compatibility
window.vkBridge = window.vkBridge || window.vkBridge;

console.log('VK Bridge mock initialized');
