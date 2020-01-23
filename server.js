const fs = require("fs");
const http = require("http");

const express = require("express");
const bodyParser = require("body-parser");
const serveStatic = require("serve-static");
const cors = require("cors");
const shortid = require("shortid");

const utilities = require("./utilities");

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(serveStatic("pages", { index: false }));

// Globals
const publicFolder = "pages";
const port = process.env.NODE_ENV === "production" ? process.env.PORT : 3000;
let db;
const dbPath = "logs/db.json";

// if logs dir not exists, make it
if (!fs.existsSync("logs/")) {
  fs.mkdirSync("logs");
}

// touch dbFile
const time = new Date();
try {
  fs.utimesSync(dbPath, time, time);
} catch (err) {
  fs.closeSync(fs.openSync(dbPath, "w"));
}

// check dbFile has valid JSON
try {
  JSON.parse(fs.readFileSync(dbPath));
} catch (err) {
  fs.writeFileSync(dbPath, "[]");
}

// read db on server startup
fs.readFile("logs/db.json", "utf8", (err, data) => {
  db = JSON.parse(data);

  // http server
  const httpServer = http.createServer(app).listen(port, () => {
    console.log("http server is running on port ", httpServer.address().port);
    console.log("current working directory is ", process.cwd());
  });
});

app.get("/", (req, res) => {
  res.send("Server is running!");
});

app.post("/buildPage", (req, res) => {
  console.log("got a buildPage request");
  const htmlInput = req.body.htmlInput;
  const cssInput = req.body.cssInput;
  const styleElement = "<style>" + cssInput + "</style>";
  const stylePos = utilities.cssInsertPos(htmlInput);
  let htmlFileContent;

  if (stylePos === null) {
    // don't know where to put the css
    // just write the html, which may be invalid as
    // there aren't any html > head tags
    console.log("style position is null");
    htmlFileContent = htmlInput;
  } else {
    htmlFileContent =
      htmlInput.slice(0, stylePos) + styleElement + htmlInput.slice(stylePos);
  }

  let pageName = req.body.pageName;
  // if req doesn't have a valid pageName
  if (!pageName) {
    pageName = shortid.generate() + ".html";
    db.push({
      name: pageName,
      date: Date.now()
    });
    fs.writeFile(dbPath, JSON.stringify(db), err => {
      err ? console.log("Writing new file in db failed: ", err) : true;
    });
    fs.appendFileSync(dbPath, "Added " + pageName + " at " + new Date() + "\n");
  } else {
    // find the page
    db.find((page, index, arr) => {
      if (page.name === pageName) {
        arr[index].date = Date.now(); // update the date
        return true; // done return true to stop
      }
    });
    fs.appendFileSync(
      dbPath,
      "Modified " + pageName + " at " + new Date() + "\n"
    );
  }

  // if publicFolder dir not exists, make it
  if (!fs.existsSync(publicFolder)) {
    fs.mkdirSync(publicFolder);
  }
  fs.writeFileSync(publicFolder + "/" + pageName, htmlFileContent);
  res.send(
    JSON.stringify({
      body: { pageName }
    })
  );
});

const deleteFiles = utilities.deleteFiles;
const interval = 15 * 60 * 1000; // 15 min
const age = 60 * 60 * 1000; // 1 hour
setInterval(() => {
  db = JSON.parse(deleteFiles(JSON.stringify(db), age));
}, interval);
