// main.ts: Vue 앱 부트스트랩 및 전역 스타일 주입
import { createApp } from 'vue';
import App from './App.vue';
import './index.css';

// 단일 루트 앱을 '#root'에 마운트하고 전역 스타일을 적용합니다.
createApp(App).mount('#root');

