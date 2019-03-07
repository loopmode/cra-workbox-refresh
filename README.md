# @loopmode/cra-workbox-refresh

Helper for `create-react-app` v2 apps that use the `workbox` service worker.  
Displays a UI that informs the user about updates and recommends a page refresh.

Based on https://developers.google.com/web/tools/workbox/guides/advanced-recipes.

<img src="https://github.com/loopmode/cra-workbox-refresh/raw/master/preview.gif" />

**_Note: Requires Node >8_**

## Installation

Install this package as a dev dependency in your project:

```
yarn add --dev @loopmode/cra-workbox-refresh
```

## Usage

Two things need to be done in your project:

1. Inject code into generated `service-worker.js` after build
2. Provide a callback when initializing workbox in your app

### 1. Inject code after build

In your `package.json`, change your build script to execute `inject-workbox-refresh` right after the build is created.

```
"scripts": {
    "build": "react-scripts build && inject-workbox-refresh"
}
```

It will inject a simple piece of code for handling a `skipWaiting` message in the generated service worker file:

```
// this is appended to build/service-worker.js after each build
self.addEventListener('message', function handleSkipWaiting(event) {
  if (event.data === 'skipWaiting') { self.skipWaiting(); }
});
```

### 2. Provide workbox callback

In your `index.js` file, where you initialize workbox, initialize the refresh mechanism as well.  
Use the `onUpdate` callback of the register function and pass along the received `registration` object.

```
import * as serviceWorker from './serviceWorker';
import initWorkboxRefresh from '@loopmode/cra-workbox-refresh';

// ...

serviceWorker.register({
    onUpdate: registration => initWorkboxRefresh(registration)
});
```

### 3. Check for service worker update and activation service worker in other tabs

In your main js file (`App.js`), you you can add specific behavior:

```
    componentDidMount() {
        if ('serviceWorker' in navigator) {
            // Reload page after message from worker (if sw activated in another tab)
            navigator.serviceWorker.addEventListener('message', function(event){
                if(event.data === 'reloadPage') {
                    window.location.reload();
                }
            });
            
            // Check for sw updates every second. You can change this interval.
            // Don't forget to clear the interval in the componentWillUnmount
            this.intervalSW = setInterval(() => navigator.serviceWorker.getRegistrations()
                .then(registrationsArray => {
                    // Check for update service worker
                    if (registrationsArray && registrationsArray[0]) {
                        registrationsArray[0].update();
                    } else {
                        console.error("serviceWorker: getRegistrations empty!")
                    }
                }), 1000)
        } else {
            console.error("Browser does not support serviceWorker!")
        }
    }
```

### Check if the service worker is already waiting.

```
    navigator.serviceWorker
        .register(swUrl)
        .then(registration => {
            if(registration.waiting && registration.active) {
                // The page has been loaded when there's already a waiting and active SW.
                // This would happen if skipWaiting() isn't being called, and there are
                // still old tabs open.
                if(config && config.onUpdate) {
                    config.onUpdate(registration);
                }
            }
            // ...
        })
        // ...
```

## Options

### textContent

Provide a custom text for the button:

```
serviceWorker.register({
    onUpdate: registration => initWorkboxRefresh(registration, {
        textContent: 'Updates loaded. Click here to refresh'
    })
});
```

### className

Provide a custom CSS class for the button:

```
serviceWorker.register({
    onUpdate: registration => initWorkboxRefresh(registration, {
        className: 'workbox-refresh'
    })
});
```

### render

Provide a custom `render` function that controls the rendered UI entirely.
It will be invoked when a new service worker becomes available and it will receive the `registration` object.  
You can provide whatever UI you need, and handle whatever events you like, you just need to call `registration.waiting.postMessage("skipWaiting")` to force the refresh.
A function that does exactly that is provided to you as 'refresh' in the options object.

Pass your custom render function:

```
serviceWorker.register({
    onUpdate: registration => initWorkboxRefresh(registration, { render: renderRefreshUI })
});
```

If you don't need any special handling, just use the received refresh function:

```
function renderRefreshUI(registration, { refresh }) {
    const el = document.createElement('div');
    document.body.appendChild(el);

    ReactDOM.render(<MyRefreshNotification onClick={refresh} />, document.getElementById(el));
}
```

If you want to handle the event manually, e.g. disable the clicked button or show a loading animation:

```
function renderRefreshUI(registration) {
    const el = document.createElement('div');
    document.body.appendChild(el);

    const handleClick = (event) => {
        // ensure registration.waiting is available
        if (registration.waiting) {
            // post the "skipWaiting" message
            registration.waiting.postMessage("skipWaiting");
            // do whatever you need to do
            event.target.disabled = true;
        }
    }
    ReactDOM.render(<MyRefreshNotification onClick={handleClick} />, el));
}

```
