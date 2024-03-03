import logo from './logo.svg';
import './App.css';

import {useEffect, useRef} from 'react';

function App() {

  var refdiv=useRef(null);
  var rte;

  function btnclick(){
    alert(rte.getHTMLCode());
  }

  setTimeout(function(){
    rte=new window.RichTextEditor(refdiv.current);
    rte.setHTMLCode("Hello World!");
  },0)

  return (
    <div className="App">
      <header className="App-header">
        <div ref={refdiv}></div>
        
        <hr/>
        <div><button onClick={btnclick}>Show HTML Code</button></div>
        
      </header>
    </div>
  );
}

export default App;
