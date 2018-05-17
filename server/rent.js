const express = require('express');
const request = require('request');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

app.get('/', (req, res) => {
  // const inputZip = req.body.zip;
  // const workAddress = req.body.userAddress.split(' ').join('+');
  const inputZip = '10019';
  const workAddress = '200+central+park+south+10019';

  const prices = [];
  const addresses = [];
  const links = [];
  // let images = [];
  // const walking = [];
  // const driving = [];
  // const transit = [];
  let jLatLong;
  const hLatLong = [];


  const makeRentRequest = (rentUrl, resolve) => {
    request(rentUrl, (error, response, html) => {
      const $ = cheerio.load(html);
      const priceAddress = $("div[class='_14vxS _14vxS']");
      const addressCheerio = $("a[class='_1YEFs _1YEFs _3g223 _3g223']");
      if (prices.length < 20) {
        priceAddress.each(((i, adr) => {
          prices.push($(adr).children().first().html());
        }));
        addressCheerio.each((i, adr) => {
          links.push(`rent.com${$(adr).attr('href')}`);
          addresses.push($(adr).text());
        });
      }
      console.log(addresses);
      resolve(1);
    });
  };

  const makeMapRequest = (mapsUrl, resolve, pushHLat) => {
    request(mapsUrl, (mapErr, mapResp, mapHtmlW) => {
      if (JSON.parse(mapHtmlW).routes[0] !== undefined) {
        // drivingP.push(Promise.resolve(JSON.parse(mapHtmlW).routes[0].legs[0].duration.text));
        resolve(JSON.parse(mapHtmlW).routes[0].legs[0].duration.text);
        if (!jLatLong) {
          jLatLong = JSON.parse(mapHtmlW).routes[0].legs[0].start_location;
        }
        if (pushHLat) {
          hLatLong.push(JSON.parse(mapHtmlW).routes[0].legs[0].end_location);
        }
      } else {
        // drivingP.push(Promise.reject(mapErr));
        resolve(mapErr);
        hLatLong.push('error');
      }
    });
  };

  const zipUrl = `https://www.zipcodeapi.com/rest/${'aeid254Ds6YNBT4DHPrswjau7XLLvdnm1ePGOfeqYpj1f9cyN7WzO6kvh2SFTUa1'}/radius.json/${inputZip}/1/km`;

  request(zipUrl, (error, response, responseData) => {
    const data = JSON.parse(responseData);
    const zipCodes = data.zip_codes.map(x => x.zip_code);

    const rentUrls = zipCodes.map(zip => `https://www.rent.com/zip-${zip}`);


    const rentP = [];
    for (let i = 0; i < rentUrls.length; i += 1) {
      const p = new Promise((resolve) => {
        makeRentRequest(rentUrls[i], resolve);
      });
      rentP.push(p);
    }

    Promise.all(rentP).then(() => {
      const drivingP = [];
      const transitP = [];

      for (let i = 0; i < addresses.length; i += 1) {
        const mapsDrivingUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${`${addresses[i]}+${inputZip}`}&destination=${workAddress}&key=${'AIzaSyDNlHntx-Cjnpq1TNvKneoyKzBHSZqdBkg'}&mode=driving`;
        const mapsTransitUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${`${addresses[i]}+${inputZip}`}&destination=${workAddress}&key=${'AIzaSyDNlHntx-Cjnpq1TNvKneoyKzBHSZqdBkg'}&mode=transit`;
        const drive = new Promise((resolve) => {
          makeMapRequest(mapsDrivingUrl, resolve, true);
        });
        drivingP.push(drive);
        const walk = new Promise((resolve) => {
          makeMapRequest(mapsTransitUrl, resolve);
        });
        transitP.push(walk);
      }
      Promise.all(drivingP).then((drivingTimes) => {
        Promise.all(transitP).then((transitTimes) => {
          const obj = {
            prices,
            addresses,
            links,
            driving: drivingTimes,
            transit: transitTimes,
            jLatLong,
            hLatLong,
          };
          console.log(obj);
          res.send();
        });
      });
    });
  });
});

// request('https://www.rent.com/zip-10019', (error, response, html) => {
//   const $ = cheerio.load(html);
//   const priceAddress = $("div[class='_14vxS _14vxS']");
//   const prices = [];
//   const addresses = [];
//   const links = [];
//   priceAddress.each(((i, img) => {
//     links.push(`rent.com${$(img).children().eq(2).attr('href')}`);
//     addresses.push($(img).children().eq(2).text());
//     prices.push($(img).children().first().html());
//   }));
//   console.log(links);
//   console.log(prices);
//   console.log(addresses);

//   const drivingP = [];
//   const transitP = [];
//   let jLatLong;
//   const hLatLong = [];
//   for (let i = 0; i < addresses.length; i += 1) {
//     const mapsDrivingUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${`${addresses[i]} + 10019`}&destination=${'116 john street'}&key=${'AIzaSyDNlHntx-Cjnpq1TNvKneoyKzBHSZqdBkg'}&mode=driving`;
//     const mapsWalkingUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${`${addresses[i]} + 10019`}&destination=${'116 john street'}&key=${'AIzaSyDNlHntx-Cjnpq1TNvKneoyKzBHSZqdBkg'}&mode=transit`;
//     const drive = new Promise((resolve) => {
//       makeMapRequest(mapsDrivingUrl, resolve);
//     });
//     drivingP.push(drive);
//     const walk = new Promise((resolve) => {
//       makeMapRequest(mapsWalkingUrl, resolve);
//     });
//     transitP.push(walk);
//   }
//   Promise.all(drivingP).then((drivingTimes) => {
//     console.log(drivingTimes);
//   });
//   Promise.all(transitP).then((transitTimes) => {
//     console.log(transitTimes);
//   });


app.listen(3300, () => {
  console.log(`listening on port ${3300}`);
});
