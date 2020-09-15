const createServe = require('./bin/createServe');
const createApp = require('./createApp')
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const ejs = require('ejs');
const fs = require('fs');
const projectPath = [];
let isProject = false;

// var indexRouter = require('./routes/index');
// var usersRouter = require('./routes/users');

var app = express();

const PATH = process.argv.splice(2)[0].split('=')[1];
fs.readdir(PATH, (err, files) => {
  if (err) console.log(err);
  if (!files) return;
  isProject = files.includes('index.html');
})

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));

app.use('*', async (req, res, next) => {
  const { pathname } = req._parsedUrl;
  const dirPath = path.join(PATH, removeCalalog(pathname));
  try {
    if (dirOrFile(dirPath) !== 'Direction' || isProject) {
      next();
      return
    }
    const haveIndexHtml = await someIndexHtml(dirPath);
    if (haveIndexHtml) {
      let url = '';
      const project = projectPath.filter(item => {
        return item.path === dirPath;
      })
      if (project.length) {
        url = project[0].url;
      } else {
        const newApp = createApp(dirPath);
        const port = await createServe(newApp);
        url = `http://localhost:${port}`;
        projectPath.push({
          path: dirPath,
          url
        })
      }
      const redirectHtml = await getHtml(path.join(__dirname, '/views/redirect.ejs'), {url});
      res.send(redirectHtml);
    } else {
      next();
    }
  } catch (err) {
    console.log(err);
  }
})

app.use(express.static(PATH));

function getHtml(PATH, data) {
  return new Promise((resolve, reject) => {
    ejs.renderFile(PATH, data ,function(err,data){
      if(err){
        reject(err);
      }else{
        resolve(data);
      }
    })
  })
}

function dirOrFile(path) {
  try {
    const stat = fs.lstatSync(path)
    if (stat.isDirectory()) {
      return 'Direction'
    } else if (stat.isFile){
      return 'File'
    }
  } catch(err) {
    return null;
  }
}

function addSlash(path) {
  return path.replace(/\/$/, '') + '/'
}

function removeCalalog(path) {
  return path.replace(/^\/catalog_/, '')
}

function someIndexHtml(path) {
  return new Promise((resolve, reject) => {
    fs.readdir(path, (err, files) => {
      if (err) reject(err);
      if (!files) return;
      resolve(files.includes('index.html'));
    })
  })
}

function getFileList(dirPath, pathname) {
  return new Promise((resolve, reject) => {
    fs.readdir(dirPath, (err, files) => {
      if (err) reject(err);
      if (!files) return;
      const data = files.map((item) => {
        const link = dirOrFile(dirPath + item) === 'Direction' ? pathname + item : removeCalalog(pathname) + item
        return {link, name: item + '/'}
      })
      resolve(data)
    })
  })
}

app.get('*', async function(req, res) {
  const { pathname } = req._parsedUrl;
  if (isProject) {
    res.sendFile(path.join(PATH, 'index.html'));
    return
  }
  try {
    const data = await getFileList(addSlash(PATH + removeCalalog(pathname)), addSlash(pathname));
    const HTML = await getHtml(path.join(__dirname, '/views/index.ejs'), {data});
    res.send(HTML);
  } catch (err) {
    console.log(err);
  }
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
