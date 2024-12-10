import { FileSystemTree, WebContainer } from "@webcontainer/api";
import { useEffect, useRef, useState, useTransition } from "react";
import { Terminal } from "@xterm/xterm";
import { Highlight, themes } from "prism-react-renderer";

// const files: FileSystemTree = {
//   public: {
//     directory: {
//       "index.html": {
//         file: {
//           contents: `
// <!DOCTYPE html>
// <html lang="en">
//   <head>
//     <meta charset="utf-8" />
//     <meta name="viewport" content="width=device-width, initial-scale=1" />
//     <meta name="theme-color" content="#000000" />
//     <meta
//       name="description"
//       content="Web site created using create-react-app"
//     />
//     <!--
//       Notice the use of %PUBLIC_URL% in the tags above.
//       It will be replaced with the URL of the \`public\` folder during the build.
//       Only files inside the \`public\` folder can be referenced from the HTML.
//
//       Unlike "/favicon.ico" or "favicon.ico", "%PUBLIC_URL%/favicon.ico" will
//       work correctly both with client-side routing and a non-root public URL.
//       Learn how to configure a non-root public URL by running \`npm run build\`.
//     -->
//     <title>React App</title>
//   </head>
//   <body>
//     <noscript>You need to enable JavaScript to run this app.</noscript>
//     <div id="root"></div>
//     <!--
//       This HTML file is a template.
//       If you open it directly in the browser, you will see an empty page.
//
//       You can add webfonts, meta tags, or analytics to this file.
//       The build step will place the bundled scripts into the <body> tag.
//
//       To begin the development, run \`npm start\` or \`yarn start\`.
//       To create a production bundle, use \`npm run build\` or \`yarn build\`.
//     -->
//   </body>
// </html>`,
//         },
//       },
//     },
//   },
//   src: {
//     directory: {
//       "index.js": {
//         file: {
//           contents: `
// import React from 'react';
// import ReactDOM from 'react-dom';
// import App from './App';
// import 'typeface-ibm-plex-sans';
//
// ReactDOM.render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>,
//   document.getElementById('root')
// );
// `,
//         },
//       },
//       "App.js": {
//         file: {
//           contents: `import PropTypes from "prop-types";
//
// function App() {
//   return (
//     <div>
//      Hello World
//     </div>
//   );
// }
//
// App.propTypes = {
//   headline: PropTypes.string,
//   showLogos: PropTypes.string,
//   backgroundImage: PropTypes.string
// }
//
// App.defaultProps = {
//   headline: 'Hello World',
//   showLogos: true,
//   backgroundImage: ''
// }
//
// export default App;`,
//         },
//       },
//     },
//   },
//   "package.json": {
//     file: {
//       contents: `
// {
//   "name": "make-hello-world",
//   "homepage": "./",
//   "version": "0.1.0",
//   "private": true,
//   "dependencies": {
//     "@testing-library/jest-dom": "^5.11.4",
//     "@testing-library/react": "^11.1.0",
//     "@testing-library/user-event": "^12.1.10",
//     "react": "^17.0.1",
//     "react-dom": "^17.0.1",
//     "react-scripts": "4.0.0",
//     "typeface-ibm-plex-sans": "^1.1.13",
//     "web-vitals": "^0.2.4"
//   },
//   "scripts": {
//     "start": "react-scripts start",
//     "build": "react-scripts build",
//     "test": "react-scripts test",
//     "eject": "react-scripts eject"
//   },
//   "eslintConfig": {
//     "extends": [
//       "react-app",
//       "react-app/jest"
//     ]
//   },
//   "browserslist": {
//     "production": [
//       ">0.2%",
//       "not dead",
//       "not op_mini all"
//     ],
//     "development": [
//       "last 1 chrome version",
//       "last 1 firefox version",
//       "last 1 safari version"
//     ]
//   }
// }`,
//     },
//   },
// };

const files: FileSystemTree = {};

const webcontainerInstance = await WebContainer.boot();
await webcontainerInstance.mount(files);

export const CodeSandbox = () => {
  const [installationComplete, setInstallationComplete] = useState(false);
  const [code, setCode] = useState<string>("");
  const [webContainerURL, setWebContainerURL] =
    useState<string>("loading.html");
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [isPending, startTransition] = useTransition();

  const terminalElRef = useRef<HTMLDivElement>(null);

  // Attach the terminal element to the terminal object and install deps
  useEffect(() => {
    if (terminalElRef.current) {
      const terminal = new Terminal({
        convertEol: true,
      });
      terminal.open(terminalElRef.current);
      setTerminal(terminal);

      (async () => {
        const setupProcess = await webcontainerInstance.spawn("pnpm", [
          "create",
          "vite",
          ".",
          "--yes",
          "--template",
          "react-ts",
        ]);

        setupProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              terminal.write(data);
            },
          }),
        );
        if ((await setupProcess.exit) !== 0) {
          throw new Error("Setup failed");
        }

        const files = await webcontainerInstance.fs.readdir(".", {
          withFileTypes: true,
        });

        const installProcess = await webcontainerInstance.spawn("pnpm", ["i"]);
        installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              terminal.write(data);
            },
          }),
        );
        if ((await installProcess.exit) !== 0) {
          throw new Error("Installation failed");
        }

        console.log(files);
        const file = await webcontainerInstance.fs.readFile(
          "/src/App.tsx",
          "utf-8",
        );
        setCode(file);
        console.log(webcontainerInstance.workdir);
        console.log(webcontainerInstance.path);
        setInstallationComplete(true);
      })();
    }
  }, [terminalElRef]);

  const handleDownload = async () => {
    console.log("exporting");
    const data = await webcontainerInstance.export(".", {
      format: "zip",
      excludes: ["node_modules"],
    });
    console.log("1");
    const zip = new Blob([data]);
    console.log("2");
    const fileName = "sandbox.zip";
    const anchor = document.createElement("a");
    anchor.style = "display:none;";
    document.body.appendChild(anchor);
    console.log({ zip });
    const url = window.URL.createObjectURL(zip);
    console.log({ url });
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const startWebServer = async () => {
    const serverProcess = await webcontainerInstance.spawn("npm", [
      "run",
      "dev",
    ]);
    console.log("Server is running");

    if (terminal) {
      void serverProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            terminal.write(data);
          },
        }),
      );
    }

    webcontainerInstance.on("server-ready", (_port, url) => {
      setWebContainerURL(url);
    });
  };

  const writeIndexJS = async (content: string) => {
    startTransition(async () => {
      await webcontainerInstance.fs.writeFile("/src/App.js", content);
    });
    setCode(content);
  };

  return (
    <div className="flex flex-col p-4 gap-1">
      <div className="flex flex-row">
        <button
          className="btn btn-accent w-96 my-4"
          disabled={!installationComplete}
          onClick={async () => {
            void startWebServer();
          }}
        >
          Execute
        </button>
        <button
          className="btn btn-circle w-96 my-4"
          disabled={!installationComplete}
          onClick={async () => {
            handleDownload();
          }}
        >
          Download
        </button>
      </div>

      <div className="flex flex-row h-96 gap-1">
        <div className="code-editor w-1/2 h-full">
          <textarea
            value={code}
            onChange={(e) => writeIndexJS(e.target.value)}
            spellCheck="false"
            className="code-input left-0 right-0 top-0 bottom-0 absolute"
          />

          <div className="code-output h-full">
            <Highlight theme={themes.dracula} code={code} language="jsx">
              {({ className, style, tokens, getLineProps, getTokenProps }) => (
                <pre className={className} style={style}>
                  {tokens.map((line, i) => (
                    <div key={i} {...getLineProps({ line })}>
                      <span className="line-number">{i + 1}</span>
                      {line.map((token, key) => (
                        <span key={key} {...getTokenProps({ token })} />
                      ))}
                    </div>
                  ))}
                </pre>
              )}
            </Highlight>
          </div>
        </div>

        <div className="mockup-browser bg-base-300 border w-1/2">
          <div className="mockup-browser-toolbar">
            <div className="input">{webContainerURL}</div>
          </div>
          <div className="bg-base-200 h-full">
            <iframe src={webContainerURL} className="w-full h-full" />
          </div>
        </div>
      </div>

      <div>
        <div ref={terminalElRef}></div>
      </div>
    </div>
  );
};
