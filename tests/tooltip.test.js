import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './helpers/app.js';
const tooltip = loadApp(["tooltipPosition","tooltips"]);

test('tooltip prefers right and flips left before leaving the viewport', () => {
    assert.deepEqual(tooltip.tooltipPosition({left:50,right:70,top:90,bottom:110}, {width:100,height:60}, {width:400,height:300}), {left:82,top:70,side:'right'});
    assert.deepEqual(tooltip.tooltipPosition({left:350,right:370,top:90,bottom:110}, {width:100,height:60}, {width:400,height:300}), {left:238,top:70,side:'left'});
});
test('tooltip remains inside a narrow viewport at top and bottom edges', () => {
    const position = tooltip.tooltipPosition({left:150,right:170,top:2,bottom:22}, {width:300,height:200}, {width:320,height:240});
    assert.ok(position.left >= 8 && position.left + 300 <= 312);
    assert.ok(position.top >= 8 && position.top + 200 <= 232);
});
