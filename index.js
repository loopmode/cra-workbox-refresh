// based on https://developers.google.com/web/tools/workbox/guides/advanced-recipes

module.exports = function initWorkboxRefresh(
    registration,
    {
        render = defaultRenderUI,
        textContent = "Updates loaded. Please click to apply.",
        className = "cra-workbox-refresh"
    } = {}
) {
    // When the user asks to refresh the UI, we'll need to reload the window
    var preventDevToolsReloadLoop;
    navigator.serviceWorker.addEventListener("controllerchange", function() {
        // Ensure refresh is only called once.
        // This works around a bug in "force update on reload".
        if (preventDevToolsReloadLoop) return;
        preventDevToolsReloadLoop = true;
        window.location.reload();
    });

    onNewServiceWorker(registration, function() {
        const refresh = () =>
            registration.waiting &&
            registration.waiting.postMessage("skipWaiting");
        render(registration, { textContent, className, refresh });
    });
};

function defaultRenderUI(registration, { textContent, className } = {}) {
    // Creates and injects a button to refresh the page.

    var button = document.createElement("button");
    button.style.position = "absolute";
    button.style.bottom = "24px";
    button.style.left = "24px";
    button.className = className;
    button.textContent = textContent;

    button.addEventListener("click", function() {
        if (!registration.waiting) {
            // Just to ensure registration.waiting is available before
            // calling postMessage()
            return;
        }
        button.disabled = true;
        registration.waiting.postMessage("skipWaiting");
    });

    document.body.appendChild(button);
}
function onNewServiceWorker(registration, callback) {
    if (registration.waiting) {
        // SW is waiting to activate. Can occur if multiple clients open and
        // one of the clients is refreshed.
        return callback();
    }

    function listenInstalledStateChange() {
        registration.installing.addEventListener("statechange", function(
            event
        ) {
            if (event.target.state === "installed") {
                // A new service worker is available, inform the user
                callback();
            }
        });
    }

    if (registration.installing) {
        return listenInstalledStateChange();
    }

    // We are currently controlled so a new SW may be found...
    // Add a listener in case a new SW is found,
    registration.addEventListener("updatefound", listenInstalledStateChange);
}
