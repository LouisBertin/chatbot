const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/hello', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({ a: 1 }, null, 3));
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
