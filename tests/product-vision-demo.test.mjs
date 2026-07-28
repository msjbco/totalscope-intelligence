import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PRODUCT_VISION_SCREENS } from "../config/product-vision/screens.ts";

const component = readFileSync("components/product-vision/product-vision-demo.tsx","utf8");
const shell = readFileSync("components/dashboard/shell.tsx","utf8");

test("Product Vision Demo contains the approved 25-screen narrative",()=>{
  assert.equal(PRODUCT_VISION_SCREENS.length,25);
  assert.deepEqual(PRODUCT_VISION_SCREENS.map(screen=>screen.id),Array.from({length:25},(_,index)=>index+1));
  assert.equal(new Set(PRODUCT_VISION_SCREENS.map(screen=>screen.section)).size,6);
});
test("every screen declares status, question, purpose, and synthetic highlights",()=>{
  for(const screen of PRODUCT_VISION_SCREENS){
    assert.ok(screen.status);
    assert.ok(screen.question.endsWith("?"));
    assert.ok(screen.message.length>20);
    assert.ok(screen.highlights.length>=3);
  }
});
test("navigation supports controls, keyboard, counter, section index, and exit",()=>{
  assert.match(component,/ArrowRight/);
  assert.match(component,/ArrowLeft/);
  assert.match(component,/Escape/);
  assert.match(component,/Previous/);
  assert.match(component,/Next →/);
  assert.match(component,/index\+1} of 25/);
  assert.match(component,/Demo sections/);
  assert.match(component,/Exit Product Vision Demo/);
});
test("authenticated shell exposes the Product Vision Demo launcher",()=>{
  assert.match(shell,/Product Vision Demo/);
  assert.match(shell,/setVisionOpen\(true\)/);
  assert.match(shell,/ProductVisionDemo open=\{visionOpen\}/);
});
test("demo remains presentation-only and does not access data or mutation clients",()=>{
  for(const source of [component,readFileSync("config/product-vision/screens.ts","utf8")]){
    assert.doesNotMatch(source,/createClient|supabase|service_role|insert\(|update\(|delete\(|fetch\(/i);
  }
});
