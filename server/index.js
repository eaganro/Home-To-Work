const express = require('express');
const parser = require('body-parser');
const mysql = require('mysql');
const axios = require('axios');
const request = require('request');
const cheerio = require('cheerio');
const dbhelper = require('../database/dbhelpers.js');
const app = express();

app.use(parser.json());
app.use(express.static(__dirname + '/../client/dist'));

// app.set('port', 8080);


app.post('/checkfavs', (req, res) => {
  const listings = req.body.data;
  const { username } = req.body;
  dbhelper.checkFavs(username, (faves) => {
    for (let i = 0; i < listings.length; i += 1) {
      for (let j = 0; j < faves.length; j += 1) {
        if (listings[i].addresses === faves[j].address) {
          listings[i].favorite = true;
        }
      }
    }
    console.log('end of checkFavs, listings: ', listings);
    res.status(200).send(listings);
  });
});

app.post('/zillow', (req, res) => {
  const inputZip = req.body.zip;
  const workAddress = req.body.userAddress.split(' ').join('+');
  const url1 = `https://www.zipcodeapi.com/rest/IYVMopKpmk4DbTEvhmk0AnYpUyZaryLwwKbkwHIbtPD0W3rNcnCMJZoKKoWze90R/radius.json/${inputZip}/1/km`;
  request(url1, (error, response, dataa) => {
    const data = JSON.parse(dataa);
    const zipCodes = data.zip_codes.map(x => x.zip_code);
    console.log(zipCodes);
    const urls = zipCodes.map(zip => `https://www.zillow.com/homes/${zip}_rb/`);
    let prices = [];
    let addresses = [];
    let images = [];
    const walking = [];
    const driving = [];
    const transit = [];
    let jLatLong;
    const hLatLong = [];

    const searchUrl = (i) => {
      request(urls[i], (err, resp, html) => {
        const $ = cheerio.load(html);
        const imgs = $("div[class='zsg-photo-card-img'] img");
        const price = $("div[class='zsg-photo-card-caption']");
        const address = $("div[class='zsg-photo-card-caption']");

        address.each((x, add) => {
          addresses.push($(add).children().last().children().first().text());
        });

        price.each((x, p) => {
          prices.push($(p).children().eq(1).children().first().children().first().text() || $(p).children().eq(1).children().first().text());
        });

        imgs.each((x, img) => {
          images.push($(img).attr('src'));
        });

        if (i < urls.length - 1) {
          searchUrl(i + 1);
        } else {
          prices = prices.map(p => String(p));
          prices = prices.map((p) => {
            let start = false;
            let end = true;
            return p.split('').filter((c) => {
              if (c === '$') {
                start = true;
                return false;
              }
              if (start === true) {
                if (c === ',') {
                  return false;
                }
                if (isNaN(parseInt(c, 10))) {
                  end = false;
                }
              }
              return start === true && end === true;
            }).join('');
          });
          prices = prices.map(p => Number(p));

          addresses = addresses.map((a) => {
            return a.split(' ').map((x) => {
              let q = x.split('');
              if (q.indexOf('-') !== -1) {
                q = q.slice(0, q.indexOf('-'));
              }
              return q.join('');
            }).join(' ');
          });


          const addr = addresses.slice();
          addresses = addresses.filter((x, z) => addr.indexOf(addr[z]) === z && prices[z] !== 0 && prices[z] <= 20000 && addresses[z] !== '');
          images = images.filter((x, z) => addr.indexOf(addr[z]) === z && prices[z] !== 0 && prices[z] <= 20000 && addresses[z] !== '');
          prices = prices.filter((x, z) => addr.indexOf(addr[z]) === z && x !== 0 && x <= 20000 && addresses[z] !== '');
          //console.log('all 3:', addresses, prices);
          addresses = addresses.slice(0, 11);
          images = images.slice(0, 11);
          prices = prices.slice(0, 11);

          const searchMaps = (homeAdd, x) => {
            const homeAddress = String(homeAdd).split(' ').join('+');
            let mapsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${workAddress}&destination=${homeAddress}&key=AIzaSyCxYMb0yg6OBzoXznjrSp2J7RQwFBViPtY&mode=driving`
            request(mapsUrl, (mapErr, mapResp, mapHtmlW) => {
              if (JSON.parse(mapHtmlW).routes[0] !== undefined) {
                driving.push(JSON.parse(mapHtmlW).routes[0].legs[0].duration.text);
                if (!jLatLong) {
                  jLatLong = JSON.parse(mapHtmlW).routes[0].legs[0].start_location;
                }
                hLatLong.push(JSON.parse(mapHtmlW).routes[0].legs[0].end_location);
              } else {
                driving.push('error');
                hLatLong.push('error');
              }
              mapsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${workAddress}&destination=${homeAddress}&key=AIzaSyCxYMb0yg6OBzoXznjrSp2J7RQwFBViPtY&mode=transit`
              request(mapsUrl, (mapErr, mapResp, mapHtmlD) => {
                if (JSON.parse(mapHtmlD).routes[0] !== undefined) {
                  transit.push(JSON.parse(mapHtmlD).routes[0].legs[0].duration.text);
                } else {
                  transit.push('error');
                }
                if (x < addresses.length - 1) {
                  searchMaps(addresses[x + 1], x + 1);
                } else {
                  console.log(prices.length);
                  console.log('done');
                  console.log(addresses);

                  const obj = {
                    prices,
                    addresses,
                    images,
                    //walking,
                    driving,
                    transit,
                    jLatLong,
                    hLatLong,
                  };
                  res.status(200).send(obj);
                }
              });
            });
            //   mapsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${workAddress}&destination=${homeAddress}&key=AIzaSyCxYMb0yg6OBzoXznjrSp2J7RQwFBViPtY&mode=transit`
            //   request(mapsUrl, (mapErr, mapResp, mapHtmlT) => {
            //     if (JSON.parse(mapHtmlT).routes[0] !== undefined) {
            //       transit.push(JSON.parse(mapHtmlT).routes[0].legs[0].duration.text);
            //     } else {
            //       transit.push('error');
            //     }
            // if (x < addresses.length - 1) {
            //   searchMaps(addresses[x + 1], x + 1);
            // } else {
            //   console.log(prices.length);
            //   console.log('done');
            //   console.log(walking);
            //   const obj = {
            //     prices,
            //     addresses,
            //     images,
            //     walking,
            //     driving,
            //     transit,
            //     jLatLong,
            //     hLatLong,
            //   };
            //   res.status(200).send(obj);
            // }
            //   });
            // });
          };
          searchMaps(addresses[0], 0);
        }
      });
    };
    searchUrl(0);
  });
});

// send a post request to database for a new user sign up
app.post('/signUp', (req, res) => {
  // obj.allow controls if a new user can sign up or not, since username is set as unique in the database
  const obj = {
    userName: '  ',
    allow: 1,
  };
  dbhelper.addNewUserSignUp(req.body.userName, req.body.password, (result, allow) => {
    if (allow === 0) {
      obj.allow = 0;
      res.status(400).send(obj);
    } else {
      obj.userName = req.body.userName;
      res.status(200).send(obj);
    }
  });
});

// send a post request to database to check login password, if not a match, set obj.allow to 0
app.post('/login', (req, res) => {
  const obj = {
    userName: '  ',
    allow: 1,
  };
  dbhelper.verifyExistingUserLogin(req.body.userName, (result) => {
    if (result.length === 0) {
      res.status(401).send();
    } else if (req.body.password === result[0].password) {
      obj.userName = req.body.userName;
      res.status(200).send(obj);
    } else {
      obj.allow = 0;
      res.status(400).send(obj);
    }
  });
});


app.post('/getFavs', (req, res) => {
  // console.log('this is req.body in app.get', req.body.username);
  dbhelper.getFavs(req.body.username, (results) => {
    // console.log('this is results in /favs after dbhelper', results);
    res.send(results);
  });
});

app.post('/favs', (req, res) => {
  const {
    price, address, image, transit, driving, hLatLong, userName
  } = req.body;

  dbhelper.saveFavs(price, address, image, transit, driving, hLatLong, userName, (result) => {
    res.send(result);
  });
});

app.post('/dfavs', (req, res) => {
  dbhelper.deleteFavs(req.body.address, req.body.userName, (result) => {
    res.send(result);
  });
});

let port = process.env.PORT || 3306;

app.listen((process.env.PORT || 3306), () => {
  console.log(`listening on port ${port}`);
});





module.exports.app = app;
