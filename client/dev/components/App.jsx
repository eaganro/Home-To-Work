import React from 'react';
import Search from './Search.jsx';
import GoogleMaps from './GoogleMaps.jsx';
import Login from './Login.jsx';
import ResultList from './ResultList.jsx';
import ResultControl from './ResultControl.jsx';
import axios from 'axios';
import { Dimmer, Loader, Image, Segment, Input } from 'semantic-ui-react';
import style from '../styles/styles2.css';

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {

      // resultList is populated with dummy data on loadup
      resultList: [],
      // adding a list to show user's favorites
      favList: [],
      // setting state to show fav list vs result list
      fMapList: [{ addresses: 'addresses', prices: 2000, driving: 'Your Work', hLatLong: { lat: 40.7484, lng: -73.9857 }, vis: false }],
      // fMapList is what the GoogleMaps.jsx uses to put markers on the map when the user in showing/looking at favorites
      showFavs: false,
      // default is HR right now maybe add more later
      latitude: 40.750611,
      longitude: -73.978641,
      hLatLong: [{ lat: 40.750611, lng: -73.978641 }],
      mapList: [{ addresses: 'addresses', prices: 2000, driving: 'Your Work', hLatLong: { lat: 40.7484, lng: -73.9857 }, vis: false }],
      
      images: [
        'http://www.cagedesigngroup.com/wp-content/uploads/2016/11/great-apartment-design-ideas-apartment-design-ideas-interior-home-design-and-decor.jpg',
        'http://cdn.home-designing.com/wp-content/uploads/2018/03/Small-tufted-back-sofa-300x250.jpg',
        'https://cdn.freshome.com/wp-content/uploads/2012/10/bes-small-apartments-designs-ideas-image-17.jpg',
        'http://boshdesigns.com/wp-content/uploads/2017/06/contemporary-apartment-interior-design-inspiration-.jpg',
        'https://cdn.decoist.com/wp-content/uploads/2013/10/Stylish-German-Apartment-by-Alexander-Zenzura.jpg',
        'http://cuantarzon.com/wp-content/uploads/2017/07/interior-design-for-apartments-entrancing-design-ecfceabeecaa-home-interior-interior-architecture.jpg',
        'https://static.dezeen.com/uploads/2017/05/tadao-ando-new-york-apartment-interior-152-elizabeth-street-gabellini-sheppard_dezeen_7-852x505.jpg',
        'http://www.fordhamroadbid.org/wp-content/uploads/2015/11/New-York.jpg',
      ],
      // mapList is what contains the values (lat and lng) necessary to render markers on the GoogleMaps.jsx
      // index 0 of mapList will be the "center" for google maps, dummy data initially, but gets updated with
      // users's work data once the user makes a search
      userName: '',
      loggedIn: 0,
      loading: false,
      userCommute: 40,
      userRent: 4000,
    };
    this.login = this.login.bind(this);
    this.signUp = this.signUp.bind(this);
    this.packData = this.packData.bind(this);
    this.handleSearch = this.handleSearch.bind(this);
    this.handleListClick = this.handleListClick.bind(this);
    this.sortData = this.sortData.bind(this);
    this.handleCommute = this.handleCommute.bind(this);
    this.handleRent = this.handleRent.bind(this);
    this.handleMarkerClick = this.handleMarkerClick.bind(this);
    this.handleUnFav = this.handleUnFav.bind(this);
    this.handleSearchList = this.handleSearchList.bind(this);
    this.handleFavList = this.handleFavList.bind(this);
  }

  // When search makes the call for data, the results from the API call are not in an ideal format
  // before pack data, the data is an array of arrays, i.e. data = [[addresses], [lat], [prices] ... etc]
  // All packData() does is make it so that data looks something like data = [{address1, lat1, price1}, {address2, lat2, price2}...]
  packData({
    prices, addresses, images, transit, driving, hLatLong,
  }) {
    const temp = [];
    console.log(hLatLong);
    for (let i = 0; i < hLatLong.length; i += 1) {
      if (driving[i].indexOf('hour') === -1 && transit[i].indexOf('hour') === -1) {
        const obj = {
          id: i,
          prices: +prices[i].split('').filter(c => c !== ',').join(''),
          addresses: addresses[i],
          images: (images[i] && images[i].slice(0, 4) === 'http') ? images[i] : this.state.images[Math.floor(Math.random() * 8)],
          driving: driving[i],
          transit: transit[i],
          hLatLong: hLatLong[i],
          favorite: false,
        };
        temp.push(obj);
      }
    }

    axios.post('/checkfavs', {
      data: temp,
      username: this.state.userName,
    })
      .then((res) => {
        this.setState({
          resultList: [],
        }, () => {
          this.setState({
            resultList: res.data,
          });
        });
      })
      .catch((err) => {
        console.log('ERROR in POST to /checkfavs, error: ', err);
      });
  }

  handleSearch({ userAddress }) {
    const zip = (userAddress.slice(userAddress.length - 5, userAddress.length));
    if (isNaN(parseFloat(zip))) return alert('Sorry, we can\'t use that address... Please include the zip code at the end!');
    this.setState({ loading: true });
    axios.post('/zillow', { zip, userAddress })
      .then((res) => {
        console.log(res);
        const mapListObj = { addresses: userAddress, prices: 'this is your work', hLatLong: res.data.hLatLong, vis: false };
        // mapListObj is the user's "Work address", aka what the user inputs into the search bar
        // temppArray then overwrites the dummy data in mapList and fMapList
        // so that the user's work marker will always be showing
        const temppArray = [];
        temppArray.push(mapListObj);
        // make sure we are sending back data in an array, send this array to pack data
        this.setState(
          {
            latitude: res.data.jLatLong.lat,
            longitude: res.data.jLatLong.lng,
            loading: false,
            mapList: temppArray,
            fMapList: temppArray,
          },
          () => {
            this.packData(res.data);
          },
        );
      })
      .catch((err) => {
        console.log(err);
      });
  }

  // clicked list will render as a Marker on the google maps
  // mapList and fMapList are initially dummy data, as the user clicks to show markers,
  // handleListClick function will push the clicked list entry's data as an object into
  // either mapList of fMapList. If that object is already in mapList however, it will be spliced
  // removing that marker from the map.
  handleListClick({ addresses, prices, hLatLong, driving }) {
    const tempObj = {
      addresses,
      prices,
      hLatLong,
      driving,
      vis: false,
      favorite: this.state.showFavs ? this.state.showFavs : false,
    };
    console.log(tempObj);
    const anotherTempArray = this.state.showFavs ? this.state.fMapList : this.state.mapList;
    const found = { exist: false, index: null };
    for (let i = 0; i < anotherTempArray.length; i += 1) {
      if (anotherTempArray[i].addresses === tempObj.addresses) {
        found.exist = true;
        found.index = i;
      }
    }
    if (found.exist) {
      anotherTempArray.splice(found.index, 1);
    } else {
      anotherTempArray.push(tempObj);
    }
    if (this.state.showFavs === true) {
      this.setState({ fMapList: anotherTempArray }, () => this.setState({ showFavs: this.state.showFavs }));
    } else if (this.state.showFavs === false) {
      this.setState({ mapList: anotherTempArray }, () => this.setState({ showFavs: this.state.showFavs }));
    }
  }

  // see handleListClick, similar function, but for displaying marker data.
  handleMarkerClick(i) {
    const tempArray = this.state.showFavs ? this.state.fMapList : this.state.mapList;
    tempArray[i].vis = !tempArray[i].vis;
    if (this.state.showFavs) {
      this.setState(
        { fMapList: tempArray },
        () => this.setState({ showFavs: this.state.showFavs })
      );
    } else {
      this.setState(
        { mapList: tempArray },
        () => this.setState({ showFavs: this.state.showFavs })
      );
    }
  }

  login(userName, password, cb) {
    if (userName === '') {
      this.setState({
        loggedIn: 1,
        userName: '',
      });
    } else {
      axios.post('/login', {
        userName,
        password,
      })
        .then((res) => {
          if (res.data.allow) {
            this.setState({
              loggedIn: 1,
              userName: res.data.userName,
            });
          } else {
            cb('Inncorect Login Information');
          }
        })
        .catch((err) => {
          console.log(err);
        });
    }
  }

  signUp(userName, password, cb) {
    axios.post('/signUp', {
      userName,
      password,
    })
      .then((res) => {
        if (res.data.allow) {
          this.setState({
            loggedIn: 1,
            userName: res.data.userName,
          });
        } else {
          cb('User Name Taken');
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }

  // Sort the results based on what sort button was clicked
  sortData(type) {
    const list = this.state.resultList;
    this.setState({
      resultList: [],
    }, () => {
      if (type === 1) {
        this.setState({
          resultList: list.sort((a, b) => {
            if (a.prices < b.prices) {
              return -1;
            } else if (a.prices > b.prices) {
              return 1;
            }
            return 0;
          }),
        });
      } else if (type === 2) {
        this.setState({
          resultList: list.sort((a, b) => {
            if (parseInt(a.transit, 10) < parseInt(b.transit, 10)) {
              return -1;
            } else if (parseInt(a.transit, 10) < parseInt(b.transit, 10)) {
              return 1;
            }
            return 0;
          }),
        });
      } else if (type === 3) {
        this.setState({
          resultList: list.sort((a, b) => {
            if (parseInt(a.driving, 10) < parseInt(b.driving, 10)) {
              return -1;
            } else if (parseInt(a.driving, 10) > parseInt(b.driving, 10)) {
              return 1;
            }
            return 0;
          }),
        });
      }
    });
  }

  // Update changes to the max rent and commute sliders
  handleRent(e) {
    this.setState({ userRent: e.target.value });
  }
  handleCommute(e) {
    this.setState({ userCommute: e.target.value });
  }

  // Handle switching back from favorites to results
  handleSearchList() {
    const list = this.state.resultList.slice();
    // resultList is set to empty before being set back to list because this made the rendering work...
    this.setState({
      showFavs: false,
      resultList: [],
    }, () => {
      this.setState({
        resultList: list,
      });
    });
  }

  // handleFavList is when the user clicks to show their favorites list
  // makes an axios call to the database, which returns all current favorites
  // the favList state is then updated with this data and then shown to the user
  handleFavList() {
    const usernameObject = {
      username: this.state.userName,
    };
    axios.post('/getFavs', usernameObject)
      .then((res) => {
        const tempFavList = [];
        for (let q = 0; q < res.data.length; q += 1) {
          const tempFavObj = {
            prices: res.data[q].price,
            addresses: res.data[q].address,
            images: res.data[q].image,
            transit: res.data[q].transit,
            driving: res.data[q].driving,
            hLatLong:{ lat: parseFloat(res.data[q].lat), lng: parseFloat(res.data[q].lng) },
            vis: false,
            favorite: true,
          };
          tempFavList.push(tempFavObj);
        }
        let list = this.state.resultList.slice();
        // favList is set to empty before being set back to list because this made the rendering work...
        this.setState(
          {
            resultList: [],
            favList: tempFavList,
          },
          () => this.setState({ showFavs: true, resultList: list },
          ));
      })
      .catch((err) => {
        console.log(err)
      })
  }

  handleUnFav(i, should) {
    const list = this.state.resultList;
    list[i].favorite = should;
    this.setState({
      resultList: list,
    });
  }

  render() {
    return (
      <div>
        {
          this.state.loggedIn ?
            <div className={style.logged}>
              <Search triggerSearch={this.handleSearch} />

              <ResultControl
                sortData={this.sortData}
                loading={this.state.loading}
                handleSearchList={this.handleSearchList}
                handleFavList={this.handleFavList}
                handleCommute={this.handleCommute}
                handleRent={this.handleRent}
                userCommute={this.state.userCommute}
                userRent={this.state.userRent}
              />
              <ResultList
                handleUnFav={this.handleUnFav}
                maxCom={this.state.userCommute}
                maxRent={this.state.userRent}
                resultList={this.state.showFavs ? this.state.favList : this.state.resultList}
                userName={this.state.userName}
                handleListClick={this.handleListClick}
              />

              <div className={style.map}>
                <GoogleMaps
                  isMarkerShown
                  resultList={this.state.resultList}
                  handleMarkerClick={this.handleMarkerClick}
                  googleMapURL="https://maps.googleapis.com/maps/api/js?key=AIzaSyDNlHntx-Cjnpq1TNvKneoyKzBHSZqdBkg&v=3.exp&libraries=geometry,drawing,places"
                  loadingElement={<div style={{ height: '100%' }} />}
                  containerElement={<div style={{ height: '83.33vh' }} />}
                  mapElement={<div style={{ height: '100%' }} />}
                  mapList={this.state.showFavs ? this.state.fMapList : this.state.mapList}
                  latitude={this.state.latitude}
                  longitude={this.state.longitude}
                  key="AIzaSyDNlHntx-Cjnpq1TNvKneoyKzBHSZqdBkg"
                />
              </div>
            </div> :
            <Login signUp={this.signUp} login={this.login} />
        }
      </div>
    );
  }
}
