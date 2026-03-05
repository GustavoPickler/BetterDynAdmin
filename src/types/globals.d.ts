/// <reference types="jquery" />

// jQuery is loaded externally via @require, declare it as global
declare const $: JQueryStatic;
declare const jQuery: JQueryStatic;

// Chrome detection
interface Window {
  chrome?: unknown;
}

