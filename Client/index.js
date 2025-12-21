import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
```

### **Step 2: Update `package.json`**

Open your **`client/package.json`** file. Find the line that starts with `"main":`.

**Change it from:**
```json
"main": "node_modules/expo/AppEntry.js",
```

**To this:**
```json
"main": "index.js",
```

### **Step 3: Clear Cache and Run**

Now that you've pointed Expo to the right file, run this command in your `client` terminal:

```bash
npx expo start --clear