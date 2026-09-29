import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CartDrawer } from './features/cart/screens/cart-drawer/cart-drawer';
import { Header } from './layout/header/header';

@Component({
  imports: [CartDrawer, Header, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {}
