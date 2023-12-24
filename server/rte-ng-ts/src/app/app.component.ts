import { Component,ElementRef,OnInit,OnChanges,AfterViewInit  } from '@angular/core';

var win=(window as any);

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit,OnChanges,AfterViewInit  {
  rte:any;
  title = 'rte-ng-ts';
  constructor(private rootref:ElementRef){}
  ngOnInit(){
    console.log("app.component.ts !ngOnInit",this,this.rootref.nativeElement.outerHTML.length)
    var rtediv=this.rootref.nativeElement.querySelector(".rtediv");
    this.rte=new win.RichTextEditor(rtediv);
    this.rte.setHTMLCode("Hello World<b>!!</b>")
  }
  ngOnChanges(){
    console.log("app.component.ts !ngOnChanges",this,this.rootref.nativeElement.outerHTML.length)
  }
  ngAfterViewInit(){
    console.log("app.component.ts !ngAfterViewInit",this,this.rootref.nativeElement.outerHTML.length)
  }
  clickToShowHtmlCode(){
    win.alert(this.rte.getHTMLCode())
  }
}

console.log("app.component.ts !load")
