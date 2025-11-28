"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// main.ts: Vue 앱 부트스트랩 및 전역 스타일 주입
var vue_1 = require("vue");
var App_vue_1 = require("./App.vue");
require("./index.css");
// 단일 루트 앱을 '#root'에 마운트하고 전역 스타일을 적용합니다.
(0, vue_1.createApp)(App_vue_1.default).mount('#root');
