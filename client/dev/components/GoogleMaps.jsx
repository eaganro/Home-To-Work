import React from 'react';
import { withScriptjs, withGoogleMap, GoogleMap } from 'react-google-maps';
import { MarkerWithLabel } from 'react-google-maps/lib/components/addons/MarkerWithLabel';

// check documentation at https://tomchentw.github.io/react-google-maps/ on the following code
const GoogleMaps = withScriptjs(withGoogleMap(props => (
  <GoogleMap
    // defaultZoom determines how zoomed in or out you want. The bigger number, the more zoomed in
    defaultZoom={13}
    // map's default center is set at the first item of the result list
    defaultCenter={{ lat: props.mapList[0].hLatLong.lat, lng: props.mapList[0].hLatLong.lng }}
    center={{ lat: props.mapList[0].hLatLong.lat, lng: props.mapList[0].hLatLong.lng }}
    key="AIzaSyDNlHntx-Cjnpq1TNvKneoyKzBHSZqdBkg"
  >
    {props.mapList.map((marker, i) => (
      <MarkerWithLabel
        position={{ lat: marker.hLatLong.lat, lng: marker.hLatLong.lng }}
        labelAnchor={new google.maps.Point(0, 0)}
        labelStyle={{ backgroundColor: 'white', padding: '10px'}}
        labelVisible={marker.vis}
        onClick={() => props.handleMarkerClick(i)}
        key={i}
      >
        <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
          Price: <div style={{ fontSize: '9px' }}>{marker.prices}</div>
          Drive: <div style={{ fontSize: '9px' }}>{marker.driving}</div>
        </div>
      </MarkerWithLabel>
    ))}
  </GoogleMap>

)));

export default GoogleMaps;
