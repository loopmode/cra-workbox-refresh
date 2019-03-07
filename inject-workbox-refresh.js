#!/usr/bin/env node

const path = require("path");
const fs = require("fs-extra");

// currently, we have no access to the  service-worker.js file created by create-react-app using workbox and webpack when the app is built.
// However, in order to provide a UI for refreshing (https://developers.google.com/web/tools/workbox/guides/advanced-recipes)
// we need to add some code to that file.
//
// our workaround is to inject the code into the generated file manually.
// this script should be executed directly after the build is finished

const codeToAppend = `
self.addEventListener('message', function handleSkipWaiting(event) {
  if (event.data === 'skipWaiting') { 
      clients.matchAll({includeUncontrolled: true}).then(function(clients) {
          // Loop over all available clients
          clients.forEach(function(client) {
              // No need to update the tab that sent the data
              if (client.id !== event.source.id ) {
                  client.postMessage('reloadPage')    
              }
          })
      })
  self.skipWaiting();
  }
});
`;

async function injectWorkboxRefresh(swFile) {
  swFile = swFile || path.resolve(`${process.cwd()}/build/service-worker.js`);

  console.group("[@loopmode/cra-workbox-refresh] injectWorkboxRefresh");
  try {
    swFile = await fs.realpath(swFile);
    console.log(">>", swFile);
    const oldContent = await fs.readFile(swFile, "utf-8");
    if (oldContent.indexOf(codeToAppend) === -1) {
      const newContent = `${oldContent}\n${codeToAppend}`;
      await fs.writeFile(swFile, newContent, "utf8");

      if (newContent === (await fs.readFile(swFile, "utf-8"))) {
        console.log(">> Injected");
      } else {
        console.error(">> Not injected");
      }
    } else {
      console.log(">> Already injected");
    }
  } catch (error) {
    console.error(error);
  }
  console.groupEnd();
}

injectWorkboxRefresh();
