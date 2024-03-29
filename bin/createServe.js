var debug = require('debug')('node-server:server');
var http = require('http');
var net = require('net');
var os = require("os");

//获取本机ip
function getIpAddress() {
  /**os.networkInterfaces() 返回一个对象，该对象包含已分配了网络地址的网络接口 */
  var interfaces = os.networkInterfaces();
  for (var devName in interfaces) {
    var iface = interfaces[devName];
    for (var i = 0; i < iface.length; i++) {
      var alias = iface[i];
      if (
        alias.family === "IPv4" &&
        alias.address !== "127.0.0.1" &&
        !alias.internal
      ) {
        return alias.address;
      }
    }
  }
}
 
// 检测端口是否被占用
function portIsOccupied (port) {
  return new Promise((resolve, reject) => {
    var server = net.createServer().listen(port);
   
    server.on('listening', function () {
      server.close();
      resolve(false);
    })
   
    server.on('error', function (err) {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      }
    })
  })
}

// 返回一个没有被占用的端口
async function getPort (port) {
  async function fn () {
    const result = await portIsOccupied(port);
    if (result) {
      port += 1;
      await fn(port);
    }
  }
  await fn();
  return port;
}

var port = 5000;

async function createServe (app) {
  port = await getPort(port);
  /**
   * Get port from environment and store in Express.
   */

  app.set('port', port);
  console.log(`http://${getIpAddress()}:${port}/`);

  /**
   * Create HTTP server.
   */

  var server = http.createServer(app);

  /**
   * Listen on provided port, on all network interfaces.
   */

  server.listen(port);
  server.on('error', onError);
  server.on('listening', () => onListening(server));
  return port;
}


function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening(server) {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}

module.exports = createServe;