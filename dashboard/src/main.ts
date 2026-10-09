import '@fontsource-variable/inter';
import { mount } from 'svelte';
import './lib/styles/app.css';
import App from './App.svelte';

export default mount(App, { target: document.getElementById('app')! });
