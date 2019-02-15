import React, { Component } from 'react';

import $ from 'jquery';
import _ from 'lodash';
import moment from 'moment';
import axios from 'axios';

import zlib from 'zlib';
import jsbeautify from 'js-beautify';
import sha512 from 'crypto-js/sha512';

import * as monaco from 'monaco-editor';


class App extends Component {
  state = {
    editor: null,
    blueprint: '',
    object: {},
  }

  constructor() {
    super();

    _.chain([
      this.onResize,
      this.onClickConvert,
    ]).forEach(x => this[x.name] = x.bind(this)).value();
    }
  componentDidMount() {
    const editor = monaco.editor.create(document.getElementById('editor'), {
      lineNumbers: 'on',
      roundedSelection: true,
      scrollBeyondLastLine: true,
      theme: 'vs-dark',
      wordWrap: 'on',
      tabSize: 2,
    });
    this.setState({ editor });

    $(window).on('resize', this.onResize);
    setTimeout(() => { this.onResize(); });
  }
  render() {
    const editorStyle = { width: '100%' };
    return (
      <div className="container-fluid">
        <div className="row">
          <div className="col col-6 m-0 p-0">
            <div className="row">
              <div className="col col-12">
                <div id="editor" style={editorStyle}></div>
              </div>
            </div>
          </div>
          <div className="col col-6">
            <div className="row mt-4">
              <div className="col col-12 form-group">
                <button className="btn btn-primary form-control" onClick={this.onClickConvert}>Convert!</button>
              </div>
            </div>
            <div className="row mt-2">
              <div className="col col-12">
                <canvas id="canvas"></canvas>
              </div>
            </div>
            {
              this.state.object.blueprint ?
              (
            <div className="row mt-2">
              <div className="col col-12">
                <ul className="list-group">
                {
                  _.chain(this.state.object.blueprint.entities).groupBy(entity => entity.name).keys().map((name, i) => (
                  <li className="list-group-item list-group-item-action list-group-item-dark" key={i}>
                    <span className="badge mr-2" style={{ backgroundColor: `#${sha512(name).toString().substring(0, 6)}` }}>
                      {_.chain(this.state.object.blueprint.entities).groupBy(entity => entity.name).value()[name].length}
                    </span>
                    {name}
                  </li>
                  )).value()
                }
                </ul>
              </div>
            </div>
              ) : null
            }
            <div className="row mt-2">
              <div className="col col-12">
                <table className="table table-sm table-dark table-hover">
                  <thead>
                    <tr>
                      <th scope="col"></th>
                      <th scope="col">Name</th>
                      <th scope="col">X</th>
                      <th scope="col">Y</th>
                      <th scope="col">Direction</th>
                    </tr>
                  </thead>
                  <tbody>
                  {
                    this.state.object.blueprint ?
                    this.state.object.blueprint.entities.map((entity, i) => (
                      <tr key={i}>
                        <th scope="row">{entity.entity_number}</th>
                        <td>{entity.name}</td>
                        <td>{entity.position.x}</td>
                        <td>{entity.position.y}</td>
                        <td>{entity.direction}</td>
                      </tr>
                    )) : (
                    <tr><th scope="row"></th><td colSpan="5">Empty.</td></tr>
                    )
                  }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  onResize = () => {
    const width = $(window).width() / 2;
    const height = $(window).height();
    this.state.editor.layout({ width, height });
  }
  onClickConvert = () => {
    const blueprint = this.state.editor.getValue();
    const object = this.blueprintToObject(blueprint);
    // monaco.editor.setModelLanguage(this.state.editor.getModel(), 'json');
    this.state.editor.setValue(jsbeautify(JSON.stringify(object), { indent_size: 2 }));
    this.setState({ object });

    const x1 = _.minBy(object.blueprint.entities, entity => entity.position.x).position.x;
    const y1 = _.minBy(object.blueprint.entities, entity => entity.position.y).position.y;
    const x2 = _.maxBy(object.blueprint.entities, entity => entity.position.x).position.x;
    const y2 = _.maxBy(object.blueprint.entities, entity => entity.position.y).position.y;
    const w = x2 - x1;
    const h = y2 - y1;
    const l = 10;

    const canvas = document.getElementById('canvas');
    $(canvas).attr({ width: (w + 1) * l, height: (h + 1) * l });

    setTimeout(() => {
      const context = canvas.getContext('2d');

      _.forEach(object.blueprint.entities, entity => {
        const x = entity.position.x - x1;
        const y = entity.position.y - y1;
        const s = this.entitySize(entity.name, entity.direction);
        const hash = sha512(entity.name).toString();
        context.fillStyle = `#${hash.substring(0, 6)}`;
        context.fillRect(x * l, y * l, s.x * l, s.y * l);
        context.beginPath();
        context.strokeStyle = `#${hash.substring(6, 12)}`;
        context.lineWidth = 1;
        context.rect(x * l, y * l, s.x * l, s.y * l);
        context.stroke();
        context.closePath();
      });
    }, 1000);
  }

  blueprintToObject(blueprint) {
    return JSON.parse(zlib.inflateSync(new Buffer(blueprint.substring(1), 'base64')).toString());
  }
  entitySize(name, direction) {
    if (/^(express-|fast-|)transport-belt$/.test(name)) {
      return { x: 1, y: 1 };
    } else if (/^(express-|fast-|)underground-belt$/.test(name)) {
      return { x: 1, y: 1 };
    } else if (/^(express-|fast-|)splitter$/.test(name)) {
      if (direction === 2 || direction === 6) {
        return { x: 1, y: 2 };
      } else if (direction === 4) {
        return { x: 2, y: 1 };
      }
    } else if (/^(fast-|)inserter$/.test(name)) {
      return { x: 1, y: 1 };
    } else if (/^long-handed-inserter$/.test(name)) {
      if (direction === 2 || direction === 6) {
        return { x: 1, y: 2 };
      } else if (direction === 4) {
        return { x: 2, y: 1 };
      }
    } else if (/^electric-furnace$/.test(name)) {
      return { x: 3, y: 3 };
    } else if (/^small-electric-pole$/.test(name)) {
      return { x: 1, y: 1 };
    } else if (/^big-electric-pole$/.test(name)) {
      return { x: 2, y: 2 };
    } else if (/^substation$/.test(name)) {
      return { x: 2, y: 2 };
    } else if (/^assembling-machine-\d+$/.test(name)) {
      return { x: 3, y: 3 };
    } else if (/^laser-turret$/.test(name)) {
      return { x: 2, y: 2 };
    } else if (/^solar-panel$/.test(name)) {
      return { x: 3, y: 3 };
    } else if (/^accumulator$/.test(name)) {
      return { x: 2, y: 2 };
    } else if (/^roboport$/.test(name)) {
      return { x: 4, y: 4 };
    }
    console.log("error:", name, direction)
    return { x: 1, y: 1 };
  }
}

export default App;
