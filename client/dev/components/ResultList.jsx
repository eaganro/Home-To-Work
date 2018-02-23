import React from 'react';
import Result from './Result.jsx';
import style from '../styles/styles2.css';

export default class ResultList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      placeholder: 'placeholder'
    };
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick(result) {
    this.props.handleListClick(result);
  }

  handleFavoritesReset() {
    this.props.handleFavorites();
  }

  render() {
    console.log('this is resultList', this.props.resultList);
    return (
      <div className={style.resultList}>
        {this.props.resultList.map((result, i) => {
          return (
          result.prices <= this.props.maxRent && parseInt(result.driving, 10) <= this.props.maxCom ?
            <Result
              result={result}
              key={i}
              i={i}
              userName={this.props.userName}
              showMarkerClick={this.handleClick}
              favorite={result.favorite}
              handleUnFav={this.props.handleUnFav}
            /> : ''
          )}
        )}
      </div>
    );
  }
}
