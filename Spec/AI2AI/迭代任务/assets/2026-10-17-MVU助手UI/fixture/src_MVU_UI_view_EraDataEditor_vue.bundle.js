"use strict";
(globalThis["webpackChunk"] = globalThis["webpackChunk"] || []).push([["src_MVU_UI_view_EraDataEditor_vue"],{

/***/ "./node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/.pnpm/sass-loader@16.0.6_sass@1.97.2_webpack@5.104.1/node_modules/sass-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/components/JsonNode/JsonNodeEdit.vue?vue&type=style&index=0&id=2e5fd471&scoped=true&lang=scss"
/*!*************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/.pnpm/sass-loader@16.0.6_sass@1.97.2_webpack@5.104.1/node_modules/sass-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/components/JsonNode/JsonNodeEdit.vue?vue&type=style&index=0&id=2e5fd471&scoped=true&lang=scss ***!
  \*************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
(module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../../../node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/runtime/noSourceMaps.js */ "./node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/runtime/noSourceMaps.js");
/* harmony import */ var _node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../../node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/runtime/api.js */ "./node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/runtime/api.js");
/* harmony import */ var _node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__);
// Imports


var ___CSS_LOADER_EXPORT___ = _node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default()((_node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default()));
// Module
___CSS_LOADER_EXPORT___.push([module.id, `@charset "UTF-8";
.json-node[data-v-2e5fd471] {
  position: relative;
}
.line[data-v-2e5fd471] {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
}
.line[data-v-2e5fd471]:hover {
  background-color: #f1f5f9;
}
.line:hover .actions[data-v-2e5fd471] {
  opacity: 1;
}
.arrow[data-v-2e5fd471] {
  cursor: pointer;
  width: 32px;
  min-width: 32px;
  min-height: 32px;
  padding: 0;
  border: 1px solid var(--mvu-control-line, #7c8ca3);
  background: var(--mvu-panel, white);
  text-align: center;
  font-size: 10px;
  color: var(--mvu-muted, #53637b);
  transition: transform 0.2s;
}
.arrow.expanded[data-v-2e5fd471] {
  transform: rotate(90deg);
}
.space[data-v-2e5fd471] {
  width: 16px;
}
.key[data-v-2e5fd471] {
  color: #1e293b;
  font-weight: 600;
}
.value[data-v-2e5fd471] {
  cursor: pointer;
}
.value.type-string[data-v-2e5fd471] {
  color: var(--mvu-success, #14734d);
}
.value.type-number[data-v-2e5fd471] {
  color: #dc2626;
}
.value.type-boolean[data-v-2e5fd471] {
  color: #7c3aed;
}
.value.type-null[data-v-2e5fd471] {
  color: #64748b;
  font-style: italic;
}
.preview[data-v-2e5fd471] {
  color: var(--mvu-muted, #53637b);
  font-style: italic;
}
.editor-container[data-v-2e5fd471] {
  display: flex;
  gap: 6px;
  align-items: center;
}
.edit-select[data-v-2e5fd471],
.edit-input[data-v-2e5fd471] {
  padding: 2px 6px;
  font-size: 12px;
  border: 1px solid var(--mvu-control-line, #7c8ca3);
  border-radius: 4px;
  background-color: #fff !important;
  color: #1e293b !important;
  font-family: monospace;
}

/* 强制下拉框选项的颜色 */
.edit-select option[data-v-2e5fd471] {
  background: #fff !important;
  color: #1e293b !important;
}
.actions[data-v-2e5fd471] {
  margin-left: auto;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}
.line:focus-within .actions[data-v-2e5fd471] {
  opacity: 1;
}
@media (pointer: coarse) {
.actions[data-v-2e5fd471] {
    opacity: 1;
}
}
.btn-action[data-v-2e5fd471] {
  border: none;
  background: transparent;
  cursor: pointer;
  color: #64748b;
  font-size: 14px;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-action[data-v-2e5fd471]:hover {
  background-color: #e2e8f0;
  color: #1e293b;
}
.btn-action.danger[data-v-2e5fd471]:hover {
  background-color: #fee2e2;
  color: #ef4444;
}
.btn-action.save[data-v-2e5fd471] {
  color: var(--mvu-success, #14734d);
}
.btn-action.cancel[data-v-2e5fd471] {
  color: #ef4444;
}
.children-container[data-v-2e5fd471] {
  padding-left: 10px;
  border-left: 1px dashed #e2e8f0;
}

/* 黑夜模式 */
.dark-mode .line[data-v-2e5fd471]:hover {
  background-color: #374151;
}
.dark-mode .arrow[data-v-2e5fd471] {
  color: var(--mvu-muted, #53637b);
}
.dark-mode .arrow.expanded[data-v-2e5fd471] {
  color: #cbd5e1;
}
.dark-mode .key[data-v-2e5fd471] {
  color: #e2e8f0;
}
.dark-mode .value.type-string[data-v-2e5fd471] {
  color: #34d399;
}
.dark-mode .value.type-number[data-v-2e5fd471] {
  color: #f87171;
}
.dark-mode .value.type-boolean[data-v-2e5fd471] {
  color: #a78bfa;
}
.dark-mode .value.type-null[data-v-2e5fd471] {
  color: #9ca3af;
}
.dark-mode .preview[data-v-2e5fd471] {
  color: #9ca3af;
}
.dark-mode .edit-select[data-v-2e5fd471],
.dark-mode .edit-input[data-v-2e5fd471] {
  background-color: #374151 !important;
  color: #e2e8f0 !important;
  border-color: var(--mvu-control-line, #8393ab);
}
.dark-mode .edit-select option[data-v-2e5fd471] {
  background: #374151 !important;
  color: #e2e8f0 !important;
}
.dark-mode .btn-action[data-v-2e5fd471] {
  color: #9ca3af;
}
.dark-mode .btn-action[data-v-2e5fd471]:hover {
  background-color: #4b5563;
  color: #f8fafc;
}
.dark-mode .btn-action.danger[data-v-2e5fd471]:hover {
  background-color: #450a0a;
  color: #fecaca;
}
.dark-mode .btn-action.save[data-v-2e5fd471] {
  color: #34d399;
}
.dark-mode .btn-action.cancel[data-v-2e5fd471] {
  color: #f87171;
}`, ""]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ },

/***/ "./node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/.pnpm/sass-loader@16.0.6_sass@1.97.2_webpack@5.104.1/node_modules/sass-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/components/JsonNode/JsonTreeEdit.vue?vue&type=style&index=0&id=0f813e0d&scoped=true&lang=scss"
/*!*************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/.pnpm/sass-loader@16.0.6_sass@1.97.2_webpack@5.104.1/node_modules/sass-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/components/JsonNode/JsonTreeEdit.vue?vue&type=style&index=0&id=0f813e0d&scoped=true&lang=scss ***!
  \*************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
(module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../../../node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/runtime/noSourceMaps.js */ "./node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/runtime/noSourceMaps.js");
/* harmony import */ var _node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../../node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/runtime/api.js */ "./node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/runtime/api.js");
/* harmony import */ var _node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__);
// Imports


var ___CSS_LOADER_EXPORT___ = _node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default()((_node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default()));
// Module
___CSS_LOADER_EXPORT___.push([module.id, `@charset "UTF-8";
.json-tree[data-v-0f813e0d] {
  font-family: monospace;
  font-size: 12px;
  overflow-x: auto;
  padding: 10px;
  background-color: #fff;
}
.empty-tree[data-v-0f813e0d] {
  padding: 20px;
  color: #9ca3af;
  text-align: center;
}

/* 黑夜模式 */
.dark-mode .json-tree[data-v-0f813e0d] {
  background-color: #1f2937;
  color: #e2e8f0;
}
.dark-mode .empty-tree[data-v-0f813e0d] {
  color: #6b7280;
}`, ""]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ },

/***/ "./node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/.pnpm/sass-loader@16.0.6_sass@1.97.2_webpack@5.104.1/node_modules/sass-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/view/EraDataEditor.vue?vue&type=style&index=0&id=bbcd8a1c&scoped=true&lang=scss"
/*!***********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/.pnpm/sass-loader@16.0.6_sass@1.97.2_webpack@5.104.1/node_modules/sass-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/view/EraDataEditor.vue?vue&type=style&index=0&id=bbcd8a1c&scoped=true&lang=scss ***!
  \***********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
(module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../../node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/runtime/noSourceMaps.js */ "./node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/runtime/noSourceMaps.js");
/* harmony import */ var _node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/runtime/api.js */ "./node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/runtime/api.js");
/* harmony import */ var _node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__);
// Imports


var ___CSS_LOADER_EXPORT___ = _node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default()((_node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default()));
// Module
___CSS_LOADER_EXPORT___.push([module.id, `.variable-editor[data-v-bbcd8a1c] {
  color: var(--mvu-text, #172033);
  display: grid;
  gap: 16px;
  min-width: 0;
  padding: 4px;
}
.editing-fields[data-v-bbcd8a1c] {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
  display: grid;
  gap: 16px;
}
.page-heading[data-v-bbcd8a1c] {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}
h2[data-v-bbcd8a1c] {
  margin: 2px 0 8px;
  font-size: 23px;
  letter-spacing: -0.03em;
}
h3[data-v-bbcd8a1c] {
  font-size: 15px;
  margin: 0;
}
p[data-v-bbcd8a1c] {
  margin: 0;
  line-height: 1.65;
  overflow-wrap: anywhere;
}
.page-heading p[data-v-bbcd8a1c]:not(.eyebrow), .hint[data-v-bbcd8a1c], .target-panel p[data-v-bbcd8a1c] {
  color: var(--mvu-muted, #64748b);
  font-size: 13px;
}
.eyebrow[data-v-bbcd8a1c] {
  color: var(--mvu-accent, #4f46e5);
  font-size: 12px;
  font-weight: 600;
}
.target-panel[data-v-bbcd8a1c], .add-field[data-v-bbcd8a1c] {
  border: 1px solid var(--mvu-line, #dce3ef);
  background: var(--mvu-soft, #f5f7fb);
  border-radius: 12px;
  padding: 16px;
  display: grid;
  gap: 8px;
  overflow-wrap: anywhere;
}
.state-badge[data-v-bbcd8a1c] {
  font-size: 12px;
  border: 1px solid var(--mvu-line, #dce3ef);
  padding: 5px 10px;
  border-radius: 20px;
  white-space: nowrap;
}
.toolbar[data-v-bbcd8a1c], .editor-controls[data-v-bbcd8a1c], .segmented[data-v-bbcd8a1c] {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
button[data-v-bbcd8a1c], .file-button[data-v-bbcd8a1c] {
  border: 1px solid var(--mvu-control-line, #7c8ca3);
  color: var(--mvu-text, #172033);
  background: var(--mvu-panel, white);
  border-radius: 8px;
  padding: 9px 12px;
  font: inherit;
  font-size: 13px;
  min-height: 40px;
  cursor: pointer;
  box-sizing: border-box;
}
button[data-v-bbcd8a1c]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
button.primary[data-v-bbcd8a1c], .segmented .selected[data-v-bbcd8a1c] {
  background: var(--mvu-accent, #4f46e5);
  border-color: transparent;
  color: var(--mvu-on-accent, white);
}
.file-button[data-v-bbcd8a1c] {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.file-button input[data-v-bbcd8a1c] {
  position: absolute;
  inset: 0;
  opacity: 0;
  width: 100%;
  cursor: pointer;
}
.file-button[data-v-bbcd8a1c]:focus-within, button[data-v-bbcd8a1c]:focus-visible {
  outline: 3px solid var(--mvu-accent, #4f46e5);
  outline-offset: 2px;
}
label[data-v-bbcd8a1c] {
  display: grid;
  gap: 7px;
  font-size: 13px;
}
input[data-v-bbcd8a1c], select[data-v-bbcd8a1c], textarea[data-v-bbcd8a1c] {
  box-sizing: border-box;
  max-width: 100%;
  width: 100%;
  padding: 10px 12px;
  font: inherit;
  color: var(--mvu-text, #172033);
  border: 1px solid var(--mvu-control-line, #7c8ca3);
  background: var(--mvu-panel, white);
  border-radius: 8px;
}
textarea[data-v-bbcd8a1c] {
  resize: vertical;
}
.raw-editor[data-v-bbcd8a1c] {
  min-height: 340px;
  font: 13px/1.7 ui-monospace, monospace;
  tab-size: 2;
}
.notice[data-v-bbcd8a1c] {
  padding: 12px;
  border-radius: 8px;
  background: var(--mvu-soft, #f5f7fb);
  font-size: 13px;
}
.error[data-v-bbcd8a1c] {
  color: var(--mvu-danger, #b91c1c);
  white-space: pre-wrap;
}
.tree-surface[data-v-bbcd8a1c] {
  border: 1px solid var(--mvu-line, #dce3ef);
  border-radius: 10px;
  padding: 8px;
  max-width: 100%;
  min-width: 0;
  overflow: auto;
}
.empty-state[data-v-bbcd8a1c] {
  padding: 24px;
  color: var(--mvu-muted, #64748b);
}
@media (max-width: 600px) {
.toolbar button[data-v-bbcd8a1c], .toolbar .file-button[data-v-bbcd8a1c] {
    flex: 1 1 140px;
    justify-content: center;
}
.raw-editor[data-v-bbcd8a1c] {
    min-height: 240px;
}
}`, ""]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ },

/***/ "./node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/cjs.js!./node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/.pnpm/sass-loader@16.0.6_sass@1.97.2_webpack@5.104.1/node_modules/sass-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/components/JsonNode/JsonNodeEdit.vue?vue&type=style&index=0&id=2e5fd471&scoped=true&lang=scss"
/*!***********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/cjs.js!./node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/.pnpm/sass-loader@16.0.6_sass@1.97.2_webpack@5.104.1/node_modules/sass-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/components/JsonNode/JsonNodeEdit.vue?vue&type=style&index=0&id=2e5fd471&scoped=true&lang=scss ***!
  \***********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! !../../../../../node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "./node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js");
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! !../../../../../node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/styleDomAPI.js */ "./node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/styleDomAPI.js");
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! !../../../../../node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/insertBySelector.js */ "./node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/insertBySelector.js");
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! !../../../../../node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js */ "./node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js");
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! !../../../../../node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/insertStyleElement.js */ "./node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/insertStyleElement.js");
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! !../../../../../node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/styleTagTransform.js */ "./node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/styleTagTransform.js");
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_stylePostLoader_js_node_modules_pnpm_sass_loader_16_0_6_sass_1_97_2_webpack_5_104_1_node_modules_sass_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_5_use_0_JsonNodeEdit_vue_vue_type_style_index_0_id_2e5fd471_scoped_true_lang_scss__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! !!../../../../../node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/cjs.js!../../../../../node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/stylePostLoader.js!../../../../../node_modules/.pnpm/sass-loader@16.0.6_sass@1.97.2_webpack@5.104.1/node_modules/sass-loader/dist/cjs.js!../../../../../node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./JsonNodeEdit.vue?vue&type=style&index=0&id=2e5fd471&scoped=true&lang=scss */ "./node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/.pnpm/sass-loader@16.0.6_sass@1.97.2_webpack@5.104.1/node_modules/sass-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/components/JsonNode/JsonNodeEdit.vue?vue&type=style&index=0&id=2e5fd471&scoped=true&lang=scss");

      
      
      
      
      
      
      
      
      

var options = {};

options.styleTagTransform = (_node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default());
options.setAttributes = (_node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default());
options.insert = _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default().bind(null, "head");
options.domAPI = (_node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default());
options.insertStyleElement = (_node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default());

var update = _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()(_node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_stylePostLoader_js_node_modules_pnpm_sass_loader_16_0_6_sass_1_97_2_webpack_5_104_1_node_modules_sass_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_5_use_0_JsonNodeEdit_vue_vue_type_style_index_0_id_2e5fd471_scoped_true_lang_scss__WEBPACK_IMPORTED_MODULE_6__["default"], options);




       /* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_stylePostLoader_js_node_modules_pnpm_sass_loader_16_0_6_sass_1_97_2_webpack_5_104_1_node_modules_sass_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_5_use_0_JsonNodeEdit_vue_vue_type_style_index_0_id_2e5fd471_scoped_true_lang_scss__WEBPACK_IMPORTED_MODULE_6__["default"] && _node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_stylePostLoader_js_node_modules_pnpm_sass_loader_16_0_6_sass_1_97_2_webpack_5_104_1_node_modules_sass_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_5_use_0_JsonNodeEdit_vue_vue_type_style_index_0_id_2e5fd471_scoped_true_lang_scss__WEBPACK_IMPORTED_MODULE_6__["default"].locals ? _node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_stylePostLoader_js_node_modules_pnpm_sass_loader_16_0_6_sass_1_97_2_webpack_5_104_1_node_modules_sass_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_5_use_0_JsonNodeEdit_vue_vue_type_style_index_0_id_2e5fd471_scoped_true_lang_scss__WEBPACK_IMPORTED_MODULE_6__["default"].locals : undefined);


/***/ },

/***/ "./node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/cjs.js!./node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/.pnpm/sass-loader@16.0.6_sass@1.97.2_webpack@5.104.1/node_modules/sass-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/components/JsonNode/JsonTreeEdit.vue?vue&type=style&index=0&id=0f813e0d&scoped=true&lang=scss"
/*!***********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/cjs.js!./node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/.pnpm/sass-loader@16.0.6_sass@1.97.2_webpack@5.104.1/node_modules/sass-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/components/JsonNode/JsonTreeEdit.vue?vue&type=style&index=0&id=0f813e0d&scoped=true&lang=scss ***!
  \***********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! !../../../../../node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "./node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js");
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! !../../../../../node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/styleDomAPI.js */ "./node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/styleDomAPI.js");
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! !../../../../../node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/insertBySelector.js */ "./node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/insertBySelector.js");
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! !../../../../../node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js */ "./node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js");
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! !../../../../../node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/insertStyleElement.js */ "./node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/insertStyleElement.js");
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! !../../../../../node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/styleTagTransform.js */ "./node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/styleTagTransform.js");
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_stylePostLoader_js_node_modules_pnpm_sass_loader_16_0_6_sass_1_97_2_webpack_5_104_1_node_modules_sass_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_5_use_0_JsonTreeEdit_vue_vue_type_style_index_0_id_0f813e0d_scoped_true_lang_scss__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! !!../../../../../node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/cjs.js!../../../../../node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/stylePostLoader.js!../../../../../node_modules/.pnpm/sass-loader@16.0.6_sass@1.97.2_webpack@5.104.1/node_modules/sass-loader/dist/cjs.js!../../../../../node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./JsonTreeEdit.vue?vue&type=style&index=0&id=0f813e0d&scoped=true&lang=scss */ "./node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/.pnpm/sass-loader@16.0.6_sass@1.97.2_webpack@5.104.1/node_modules/sass-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/components/JsonNode/JsonTreeEdit.vue?vue&type=style&index=0&id=0f813e0d&scoped=true&lang=scss");

      
      
      
      
      
      
      
      
      

var options = {};

options.styleTagTransform = (_node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default());
options.setAttributes = (_node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default());
options.insert = _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default().bind(null, "head");
options.domAPI = (_node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default());
options.insertStyleElement = (_node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default());

var update = _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()(_node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_stylePostLoader_js_node_modules_pnpm_sass_loader_16_0_6_sass_1_97_2_webpack_5_104_1_node_modules_sass_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_5_use_0_JsonTreeEdit_vue_vue_type_style_index_0_id_0f813e0d_scoped_true_lang_scss__WEBPACK_IMPORTED_MODULE_6__["default"], options);




       /* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_stylePostLoader_js_node_modules_pnpm_sass_loader_16_0_6_sass_1_97_2_webpack_5_104_1_node_modules_sass_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_5_use_0_JsonTreeEdit_vue_vue_type_style_index_0_id_0f813e0d_scoped_true_lang_scss__WEBPACK_IMPORTED_MODULE_6__["default"] && _node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_stylePostLoader_js_node_modules_pnpm_sass_loader_16_0_6_sass_1_97_2_webpack_5_104_1_node_modules_sass_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_5_use_0_JsonTreeEdit_vue_vue_type_style_index_0_id_0f813e0d_scoped_true_lang_scss__WEBPACK_IMPORTED_MODULE_6__["default"].locals ? _node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_stylePostLoader_js_node_modules_pnpm_sass_loader_16_0_6_sass_1_97_2_webpack_5_104_1_node_modules_sass_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_5_use_0_JsonTreeEdit_vue_vue_type_style_index_0_id_0f813e0d_scoped_true_lang_scss__WEBPACK_IMPORTED_MODULE_6__["default"].locals : undefined);


/***/ },

/***/ "./node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/cjs.js!./node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/.pnpm/sass-loader@16.0.6_sass@1.97.2_webpack@5.104.1/node_modules/sass-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/view/EraDataEditor.vue?vue&type=style&index=0&id=bbcd8a1c&scoped=true&lang=scss"
/*!*********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/cjs.js!./node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/.pnpm/sass-loader@16.0.6_sass@1.97.2_webpack@5.104.1/node_modules/sass-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/view/EraDataEditor.vue?vue&type=style&index=0&id=bbcd8a1c&scoped=true&lang=scss ***!
  \*********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! !../../../../node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "./node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js");
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! !../../../../node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/styleDomAPI.js */ "./node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/styleDomAPI.js");
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! !../../../../node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/insertBySelector.js */ "./node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/insertBySelector.js");
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! !../../../../node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js */ "./node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js");
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! !../../../../node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/insertStyleElement.js */ "./node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/insertStyleElement.js");
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! !../../../../node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/styleTagTransform.js */ "./node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/runtime/styleTagTransform.js");
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_stylePostLoader_js_node_modules_pnpm_sass_loader_16_0_6_sass_1_97_2_webpack_5_104_1_node_modules_sass_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_5_use_0_EraDataEditor_vue_vue_type_style_index_0_id_bbcd8a1c_scoped_true_lang_scss__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! !!../../../../node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/cjs.js!../../../../node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/stylePostLoader.js!../../../../node_modules/.pnpm/sass-loader@16.0.6_sass@1.97.2_webpack@5.104.1/node_modules/sass-loader/dist/cjs.js!../../../../node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./EraDataEditor.vue?vue&type=style&index=0&id=bbcd8a1c&scoped=true&lang=scss */ "./node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/.pnpm/sass-loader@16.0.6_sass@1.97.2_webpack@5.104.1/node_modules/sass-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/view/EraDataEditor.vue?vue&type=style&index=0&id=bbcd8a1c&scoped=true&lang=scss");

      
      
      
      
      
      
      
      
      

var options = {};

options.styleTagTransform = (_node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default());
options.setAttributes = (_node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default());
options.insert = _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default().bind(null, "head");
options.domAPI = (_node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default());
options.insertStyleElement = (_node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default());

var update = _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()(_node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_stylePostLoader_js_node_modules_pnpm_sass_loader_16_0_6_sass_1_97_2_webpack_5_104_1_node_modules_sass_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_5_use_0_EraDataEditor_vue_vue_type_style_index_0_id_bbcd8a1c_scoped_true_lang_scss__WEBPACK_IMPORTED_MODULE_6__["default"], options);




       /* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_stylePostLoader_js_node_modules_pnpm_sass_loader_16_0_6_sass_1_97_2_webpack_5_104_1_node_modules_sass_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_5_use_0_EraDataEditor_vue_vue_type_style_index_0_id_bbcd8a1c_scoped_true_lang_scss__WEBPACK_IMPORTED_MODULE_6__["default"] && _node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_stylePostLoader_js_node_modules_pnpm_sass_loader_16_0_6_sass_1_97_2_webpack_5_104_1_node_modules_sass_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_5_use_0_EraDataEditor_vue_vue_type_style_index_0_id_bbcd8a1c_scoped_true_lang_scss__WEBPACK_IMPORTED_MODULE_6__["default"].locals ? _node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_stylePostLoader_js_node_modules_pnpm_sass_loader_16_0_6_sass_1_97_2_webpack_5_104_1_node_modules_sass_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_5_use_0_EraDataEditor_vue_vue_type_style_index_0_id_bbcd8a1c_scoped_true_lang_scss__WEBPACK_IMPORTED_MODULE_6__["default"].locals : undefined);


/***/ },

/***/ "./node_modules/.pnpm/ts-loader@9.5.4_typescript@_1325e46b45641fb4b445955fad1b3b9a/node_modules/ts-loader/index.js??clonedRuleSet-1!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/components/JsonNode/JsonNodeEdit.vue?vue&type=script&setup=true&lang=ts"
/*!*************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/ts-loader@9.5.4_typescript@_1325e46b45641fb4b445955fad1b3b9a/node_modules/ts-loader/index.js??clonedRuleSet-1!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/components/JsonNode/JsonNodeEdit.vue?vue&type=script&setup=true&lang=ts ***!
  \*************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var vue__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! vue */ "./node_modules/.pnpm/vue@3.5.26_typescript@6.0.0-dev.20250807/node_modules/vue/dist/vue.runtime.esm-bundler.js");
/* harmony import */ var _MVU_stores_UIStore__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/MVU助手/stores/UIStore */ "./src/MVU助手/stores/UIStore.ts");



/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (/*@__PURE__*/(0,vue__WEBPACK_IMPORTED_MODULE_0__.defineComponent)({
    __name: 'JsonNodeEdit',
    props: {
        node: { type: Object, required: true },
        editingNodePath: { type: [String, null], required: true }
    },
    emits: ["toggleExpand", "startEdit", "cancelEdit", "saveEdit", "addChild", "removeNode"],
    setup(__props, { expose: __expose, emit: __emit }) {
        __expose();
        const uiStore = (0,_MVU_stores_UIStore__WEBPACK_IMPORTED_MODULE_1__.useUiStore)();
        const props = __props;
        const emit = __emit;
        const inputRef = (0,vue__WEBPACK_IMPORTED_MODULE_0__.ref)(null);
        const editButtonRef = (0,vue__WEBPACK_IMPORTED_MODULE_0__.ref)(null);
        const isEditing = (0,vue__WEBPACK_IMPORTED_MODULE_0__.computed)(() => props.node.path === props.editingNodePath);
        const editType = (0,vue__WEBPACK_IMPORTED_MODULE_0__.ref)('string');
        const editValue = (0,vue__WEBPACK_IMPORTED_MODULE_0__.ref)('');
        /* ---------- 值格式化与样式 ---------- */
        const formattedValue = (0,vue__WEBPACK_IMPORTED_MODULE_0__.computed)(() => {
            const val = props.node.value;
            if (typeof val === 'string')
                return `"${val}"`;
            return String(val);
        });
        const valueClass = (0,vue__WEBPACK_IMPORTED_MODULE_0__.computed)(() => {
            const val = props.node.value;
            if (val === null)
                return 'type-null';
            return `type-${typeof val}`;
        });
        /* ---------- 编辑逻辑 ---------- */
        function getValueType(value) {
            if (value === null)
                return 'null';
            const type = typeof value;
            if (['string', 'number', 'boolean'].includes(type)) {
                return type;
            }
            return 'string'; // 默认为字符串
        }
        function startEdit() {
            if (!props.node.isLeaf)
                return; // 只允许编辑叶子节点
            editType.value = getValueType(props.node.value);
            editValue.value = props.node.value;
            emit('startEdit', props.node.path);
        }
        function onDoubleClick() {
            startEdit();
        }
        function cancel() {
            emit('cancelEdit');
            (0,vue__WEBPACK_IMPORTED_MODULE_0__.nextTick)(() => editButtonRef.value?.focus());
        }
        function save() {
            let finalValue = editValue.value;
            if (editType.value === 'boolean') {
                finalValue = Boolean(editValue.value);
            }
            else if (editType.value === 'null') {
                finalValue = null;
            }
            // number 类型由 v-model.number 自动转换
            emit('saveEdit', { path: props.node.path, value: finalValue });
            (0,vue__WEBPACK_IMPORTED_MODULE_0__.nextTick)(() => editButtonRef.value?.focus());
        }
        (0,vue__WEBPACK_IMPORTED_MODULE_0__.watch)(isEditing, isNowEditing => {
            if (isNowEditing) {
                (0,vue__WEBPACK_IMPORTED_MODULE_0__.nextTick)(() => {
                    inputRef.value?.focus();
                    if (inputRef.value?.tagName === 'INPUT')
                        inputRef.value.select();
                });
            }
        });
        const __returned__ = { uiStore, props, emit, inputRef, editButtonRef, isEditing, editType, editValue, formattedValue, valueClass, getValueType, startEdit, onDoubleClick, cancel, save };
        Object.defineProperty(__returned__, '__isScriptSetup', { enumerable: false, value: true });
        return __returned__;
    }
}));


/***/ },

/***/ "./node_modules/.pnpm/ts-loader@9.5.4_typescript@_1325e46b45641fb4b445955fad1b3b9a/node_modules/ts-loader/index.js??clonedRuleSet-1!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/components/JsonNode/JsonTreeEdit.vue?vue&type=script&setup=true&lang=ts"
/*!*************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/ts-loader@9.5.4_typescript@_1325e46b45641fb4b445955fad1b3b9a/node_modules/ts-loader/index.js??clonedRuleSet-1!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/components/JsonNode/JsonTreeEdit.vue?vue&type=script&setup=true&lang=ts ***!
  \*************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var vue__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! vue */ "./node_modules/.pnpm/vue@3.5.26_typescript@6.0.0-dev.20250807/node_modules/vue/dist/vue.runtime.esm-bundler.js");
/* harmony import */ var lodash__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! lodash */ "./node_modules/.pnpm/lodash@4.17.21/node_modules/lodash/lodash.js");
/* harmony import */ var lodash__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(lodash__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _JsonNodeEdit_vue__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./JsonNodeEdit.vue */ "./src/MVU助手/UI/components/JsonNode/JsonNodeEdit.vue");
/* harmony import */ var _MVU_stores_UIStore__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @/MVU助手/stores/UIStore */ "./src/MVU助手/stores/UIStore.ts");





/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (/*@__PURE__*/(0,vue__WEBPACK_IMPORTED_MODULE_0__.defineComponent)({
    __name: 'JsonTreeEdit',
    props: {
        data: { type: null, required: true },
        searchQuery: { type: String, required: false }
    },
    emits: ["update:data"],
    setup(__props, { expose: __expose, emit: __emit }) {
        __expose();
        const uiStore = (0,_MVU_stores_UIStore__WEBPACK_IMPORTED_MODULE_3__.useUiStore)();
        /* ---------- Props / Emits ---------- */
        const props = __props;
        const emit = __emit;
        /* ---------- 状态管理 ---------- */
        const roots = (0,vue__WEBPACK_IMPORTED_MODULE_0__.ref)([]);
        const editingNodePath = (0,vue__WEBPACK_IMPORTED_MODULE_0__.ref)(null);
        // --- 新增：用于保存和恢复展开状态的辅助函数 ---
        /**
         * 递归获取所有已展开节点的路径
         * @param nodes - 当前要遍历的节点数组
         * @returns 一个包含所有展开节点路径的 Set
         */
        function getExpandedPaths(nodes) {
            const paths = new Set();
            for (const node of nodes) {
                if (node.expanded) {
                    paths.add(node.path);
                    if (node.children) {
                        // 递归地从子节点中获取
                        getExpandedPaths(node.children).forEach(p => paths.add(p));
                    }
                }
            }
            return paths;
        }
        /**
         * 递归地根据路径集合恢复节点的展开状态
         * @param nodes - 当前要遍历的节点数组
         * @param expandedPaths - 包含所有应展开节点路径的 Set
         */
        function restoreExpandedState(nodes, expandedPaths) {
            for (const node of nodes) {
                if (expandedPaths.has(node.path)) {
                    node.expanded = true;
                }
                if (node.children) {
                    restoreExpandedState(node.children, expandedPaths);
                }
            }
        }
        /* ---------- 核心：响应式树构建 ---------- */
        function buildReactiveTree(obj, depth = 0, path = '') {
            if (obj === null || typeof obj !== 'object')
                return [];
            return Object.keys(obj).map(key => {
                const value = obj[key];
                const currentPath = path ? (Array.isArray(obj) ? `${path}[${key}]` : `${path}.${key}`) : key;
                const isLeaf = value === null || typeof value !== 'object';
                const node = (0,vue__WEBPACK_IMPORTED_MODULE_0__.reactive)({
                    key,
                    value,
                    depth,
                    path: currentPath,
                    isLeaf,
                    expanded: false, // 默认折叠
                    children: isLeaf ? undefined : buildReactiveTree(value, depth + 1, currentPath),
                });
                return node;
            });
        }
        // --- 修改：监听外部 data 变化，重建树并恢复状态 ---
        (0,vue__WEBPACK_IMPORTED_MODULE_0__.watch)(() => props.data, (newData, oldData) => {
            // 1. 在重建树之前，保存当前已展开节点的路径
            const expandedPaths = getExpandedPaths(roots.value);
            // 2. 重建树
            roots.value = buildReactiveTree(newData);
            // 3. 恢复展开状态
            restoreExpandedState(roots.value, expandedPaths);
        }, { immediate: true }); // 注意：这里的 deep: true 可以移除了，因为我们是在替换整个 data 对象，浅层监听引用变化即可。
        /* ---------- 搜索与过滤 (已集成) ---------- */
        const filteredRoots = (0,vue__WEBPACK_IMPORTED_MODULE_0__.computed)(() => {
            const query = (props.searchQuery || '').trim().toLowerCase();
            if (!query) {
                return roots.value;
            }
            const searchableRoots = (0,lodash__WEBPACK_IMPORTED_MODULE_1__.cloneDeep)(roots.value);
            function filter(nodes) {
                const result = [];
                for (const node of nodes) {
                    const keyMatch = String(node.key).toLowerCase().includes(query);
                    const valueMatch = node.isLeaf && String(node.value).toLowerCase().includes(query);
                    const children = node.children ? filter(node.children) : [];
                    if (keyMatch || valueMatch || children.length > 0) {
                        // 如果子节点有匹配，则强制展开父节点以显示结果
                        node.expanded = children.length > 0;
                        node.children = children;
                        result.push(node);
                    }
                }
                return result;
            }
            return filter(searchableRoots);
        });
        /* ---------- 事件处理 ---------- */
        function findNodeByPath(nodes, path) {
            for (const node of nodes) {
                if (node.path === path)
                    return node;
                if (path.startsWith(node.path) && node.children) {
                    const found = findNodeByPath(node.children, path);
                    if (found)
                        return found;
                }
            }
            return null;
        }
        function toggleExpand(node) {
            // 直接在原始树上操作，这样即使用户清空搜索，展开/折叠状态也能保留
            const originalNode = findNodeByPath(roots.value, node.path);
            if (originalNode) {
                originalNode.expanded = !originalNode.expanded;
            }
        }
        function startEdit(path) {
            editingNodePath.value = path;
        }
        function cancelEdit() {
            editingNodePath.value = null;
        }
        function saveEdit({ path, value }) {
            const newData = (0,lodash__WEBPACK_IMPORTED_MODULE_1__.cloneDeep)(props.data);
            (0,lodash__WEBPACK_IMPORTED_MODULE_1__.set)(newData, path, value);
            emit('update:data', newData);
            editingNodePath.value = null;
        }
        function addChild({ path, isObject }) {
            const newData = (0,lodash__WEBPACK_IMPORTED_MODULE_1__.cloneDeep)(props.data);
            const parent = (0,lodash__WEBPACK_IMPORTED_MODULE_1__.get)(newData, path);
            if (parent === undefined || typeof parent !== 'object') {
                console.warn(`Cannot add child to non-object path: ${path}`);
                return;
            }
            const newKey = isObject ? 'newKey' : parent.length;
            const newPath = isObject ? `${path}.newKey` : `${path}[${newKey}]`;
            (0,lodash__WEBPACK_IMPORTED_MODULE_1__.set)(newData, newPath, 'newValue');
            emit('update:data', newData);
            const parentNode = findNodeByPath(roots.value, path);
            if (parentNode)
                parentNode.expanded = true;
            setTimeout(() => {
                editingNodePath.value = newPath;
            }, 100);
        }
        function removeNode(path) {
            const newData = (0,lodash__WEBPACK_IMPORTED_MODULE_1__.cloneDeep)(props.data);
            (0,lodash__WEBPACK_IMPORTED_MODULE_1__.unset)(newData, path);
            const parentPath = path.substring(0, path.lastIndexOf('.')) || path.substring(0, path.lastIndexOf('['));
            if (parentPath) {
                const parent = (0,lodash__WEBPACK_IMPORTED_MODULE_1__.get)(newData, parentPath);
                if (Array.isArray(parent)) {
                    const cleanedArray = parent.filter(item => item !== null && item !== undefined);
                    (0,lodash__WEBPACK_IMPORTED_MODULE_1__.set)(newData, parentPath, cleanedArray);
                }
            }
            emit('update:data', newData);
        }
        const __returned__ = { uiStore, props, emit, roots, editingNodePath, getExpandedPaths, restoreExpandedState, buildReactiveTree, filteredRoots, findNodeByPath, toggleExpand, startEdit, cancelEdit, saveEdit, addChild, removeNode, JsonNodeEdit: _JsonNodeEdit_vue__WEBPACK_IMPORTED_MODULE_2__["default"] };
        Object.defineProperty(__returned__, '__isScriptSetup', { enumerable: false, value: true });
        return __returned__;
    }
}));


/***/ },

/***/ "./node_modules/.pnpm/ts-loader@9.5.4_typescript@_1325e46b45641fb4b445955fad1b3b9a/node_modules/ts-loader/index.js??clonedRuleSet-1!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/view/EraDataEditor.vue?vue&type=script&setup=true&lang=ts"
/*!***********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/ts-loader@9.5.4_typescript@_1325e46b45641fb4b445955fad1b3b9a/node_modules/ts-loader/index.js??clonedRuleSet-1!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/view/EraDataEditor.vue?vue&type=script&setup=true&lang=ts ***!
  \***********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var vue__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! vue */ "./node_modules/.pnpm/vue@3.5.26_typescript@6.0.0-dev.20250807/node_modules/vue/dist/vue.runtime.esm-bundler.js");
/* harmony import */ var lodash__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! lodash */ "./node_modules/.pnpm/lodash@4.17.21/node_modules/lodash/lodash.js");
/* harmony import */ var lodash__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(lodash__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _stores_EraEditStore__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../stores/EraEditStore */ "./src/MVU助手/stores/EraEditStore.ts");
/* harmony import */ var _stores_UIStore__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../stores/UIStore */ "./src/MVU助手/stores/UIStore.ts");
/* harmony import */ var _utils_MvuEditTarget__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../utils/MvuEditTarget */ "./src/MVU助手/utils/MvuEditTarget.ts");
/* harmony import */ var _utils_modal__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../utils/modal */ "./src/MVU助手/utils/modal.ts");
/* harmony import */ var _components_JsonNode_JsonTreeEdit_vue__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../components/JsonNode/JsonTreeEdit.vue */ "./src/MVU助手/UI/components/JsonNode/JsonTreeEdit.vue");








/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (/*@__PURE__*/(0,vue__WEBPACK_IMPORTED_MODULE_0__.defineComponent)({
    __name: 'EraDataEditor',
    setup(__props, { expose: __expose }) {
        __expose();
        const store = (0,_stores_EraEditStore__WEBPACK_IMPORTED_MODULE_2__.useEraEditStore)();
        const uiStore = (0,_stores_UIStore__WEBPACK_IMPORTED_MODULE_3__.useUiStore)();
        const target = (0,vue__WEBPACK_IMPORTED_MODULE_0__.shallowRef)(null);
        const currentData = (0,vue__WEBPACK_IMPORTED_MODULE_0__.ref)(null);
        const loading = (0,vue__WEBPACK_IMPORTED_MODULE_0__.ref)(false), saving = (0,vue__WEBPACK_IMPORTED_MODULE_0__.ref)(false);
        const error = (0,vue__WEBPACK_IMPORTED_MODULE_0__.ref)(''), statusMessage = (0,vue__WEBPACK_IMPORTED_MODULE_0__.ref)('');
        const editMode = (0,vue__WEBPACK_IMPORTED_MODULE_0__.ref)('tree');
        const rawJsonString = (0,vue__WEBPACK_IMPORTED_MODULE_0__.ref)(''), jsonParseError = (0,vue__WEBPACK_IMPORTED_MODULE_0__.ref)(''), searchQuery = (0,vue__WEBPACK_IMPORTED_MODULE_0__.ref)('');
        const showAddField = (0,vue__WEBPACK_IMPORTED_MODULE_0__.ref)(false);
        const newField = (0,vue__WEBPACK_IMPORTED_MODULE_0__.ref)({ path: '', type: 'string', value: '' });
        const describe = (cause) => cause instanceof Error ? cause.message : String(cause);
        function readDraft() {
            const draft = editMode.value === 'raw' ? JSON.parse(rawJsonString.value) : currentData.value;
            if (!(0,lodash__WEBPACK_IMPORTED_MODULE_1__.isPlainObject)(draft))
                throw new Error('变量数据必须是 JSON 对象，不能是数组、null 或标量');
            return draft;
        }
        const hasChanges = (0,vue__WEBPACK_IMPORTED_MODULE_0__.computed)(() => {
            if (!currentData.value || !target.value)
                return false;
            try {
                return !(0,lodash__WEBPACK_IMPORTED_MODULE_1__.isEqual)(readDraft(), target.value.baseline);
            }
            catch {
                return true;
            }
        });
        (0,vue__WEBPACK_IMPORTED_MODULE_0__.watch)(hasChanges, changed => {
            if (changed && statusMessage.value === '变量更改已保存到绑定消息。')
                statusMessage.value = '';
        });
        function setDraft(data) {
            currentData.value = (0,lodash__WEBPACK_IMPORTED_MODULE_1__.cloneDeep)(data);
            rawJsonString.value = JSON.stringify(data, null, 2);
            jsonParseError.value = '';
        }
        function validateRawJson() {
            statusMessage.value = '';
            try {
                readDraft();
                jsonParseError.value = '';
            }
            catch (cause) {
                jsonParseError.value = describe(cause);
            }
        }
        function switchToTreeMode() {
            if (editMode.value === 'tree')
                return;
            try {
                currentData.value = (0,lodash__WEBPACK_IMPORTED_MODULE_1__.cloneDeep)(readDraft());
                editMode.value = 'tree';
                jsonParseError.value = '';
            }
            catch (cause) {
                jsonParseError.value = describe(cause);
            }
        }
        function switchToRawMode() {
            if (editMode.value === 'raw')
                return;
            rawJsonString.value = JSON.stringify(currentData.value, null, 2);
            editMode.value = 'raw';
        }
        function formatJson() {
            try {
                rawJsonString.value = JSON.stringify(readDraft(), null, 2);
                jsonParseError.value = '';
            }
            catch (cause) {
                jsonParseError.value = describe(cause);
            }
        }
        function download(name, value, type) {
            const url = URL.createObjectURL(new Blob([value], { type }));
            const link = document.createElement('a');
            link.href = url;
            link.download = name;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
        function exportDraft() {
            error.value = '';
            try {
                download('mvu-stat-data-草稿.json', JSON.stringify(readDraft(), null, 2), 'application/json;charset=utf-8');
                statusMessage.value = '已导出当前有效草稿；导出不会保存到消息。';
            }
            catch (cause) {
                error.value = `无法导出 JSON：${describe(cause)}。草稿保留，可导出原始文本。`;
            }
        }
        function exportRawText() {
            download('mvu-stat-data-未解析草稿.txt', rawJsonString.value, 'text/plain;charset=utf-8');
            statusMessage.value = '已保留原始编辑文本，该文件尚不是有效变量 JSON。';
        }
        async function importFile(event, difference) {
            const input = event.target;
            const file = input.files?.[0];
            input.value = '';
            if (!file)
                return;
            error.value = '';
            statusMessage.value = '';
            try {
                if (!target.value)
                    throw new Error('请先加载消息目标，再导入变量草稿。');
                const imported = JSON.parse(await file.text());
                if (!(0,lodash__WEBPACK_IMPORTED_MODULE_1__.isPlainObject)(imported))
                    throw new Error('导入内容必须是 JSON 对象。');
                const base = difference ? (0,lodash__WEBPACK_IMPORTED_MODULE_1__.cloneDeep)(readDraft()) : null;
                if (!(await _utils_modal__WEBPACK_IMPORTED_MODULE_5__.Modal.confirm(difference ? '合并差分到草稿' : '替换变量草稿', `${difference ? '合并文件中的字段，已有字段可能被覆盖。' : '文件将替换整个当前草稿。'}此操作尚未写入消息，之后仍需保存。`)))
                    return;
                setDraft(difference ? (0,lodash__WEBPACK_IMPORTED_MODULE_1__.merge)({}, base, imported) : imported);
                statusMessage.value = '文件已导入草稿，尚未保存到消息。';
            }
            catch (cause) {
                error.value = `导入失败：${describe(cause)} 原草稿保留。`;
            }
        }
        async function refreshData() {
            if (loading.value || saving.value)
                return;
            if (hasChanges.value && !(await _utils_modal__WEBPACK_IMPORTED_MODULE_5__.Modal.confirm('放弃草稿并重新加载？', '重新加载成功后会替换当前未保存草稿。可先取消并导出草稿备份；读取失败会保留草稿。')))
                return;
            loading.value = true;
            error.value = '';
            statusMessage.value = '';
            try {
                const loaded = await store.loadTarget();
                setDraft(loaded.baseline);
                target.value = loaded;
                statusMessage.value = '目标与变量已加载。';
            }
            catch (cause) {
                error.value = `加载失败：${describe(cause)} 已有草稿保留，可重试。`;
            }
            finally {
                loading.value = false;
            }
        }
        async function saveData() {
            if (!target.value || !hasChanges.value || saving.value)
                return;
            error.value = '';
            statusMessage.value = '';
            try {
                const data = (0,lodash__WEBPACK_IMPORTED_MODULE_1__.cloneDeep)(readDraft());
                const bound = target.value;
                if (!(await _utils_modal__WEBPACK_IMPORTED_MODULE_5__.Modal.confirm('保存变量更改', `将完整变量草稿写入 ${(0,_utils_MvuEditTarget__WEBPACK_IMPORTED_MODULE_4__.targetDescription)(bound)}。其他入口已修改的变量不会被旧快照覆盖。`)))
                    return;
                saving.value = true;
                const saved = await store.saveEraEdit(data, bound);
                target.value = saved;
                setDraft(data);
                statusMessage.value = '变量更改已保存到绑定消息。';
            }
            catch (cause) {
                error.value = `保存未完成：${describe(cause)}`;
            }
            finally {
                saving.value = false;
            }
        }
        function addField() {
            error.value = '';
            statusMessage.value = '';
            try {
                const path = newField.value.path.trim();
                if (!path || path.split(/[.[\]]/).some(part => ['__proto__', 'prototype', 'constructor'].includes(part)))
                    throw new Error('请输入有效且安全的字段路径。');
                const type = newField.value.type;
                const text = newField.value.value;
                const value = type === 'string' ? text : type === 'null' ? null : JSON.parse(text);
                if (type === 'number' && (typeof value !== 'number' || !Number.isFinite(value)))
                    throw new Error('请输入有效数字。');
                if (type === 'boolean' && typeof value !== 'boolean')
                    throw new Error('布尔值须填写 true 或 false。');
                if (type === 'object' && !(0,lodash__WEBPACK_IMPORTED_MODULE_1__.isPlainObject)(value))
                    throw new Error('请输入 JSON 对象。');
                if (type === 'array' && !Array.isArray(value))
                    throw new Error('请输入 JSON 数组。');
                const next = (0,lodash__WEBPACK_IMPORTED_MODULE_1__.cloneDeep)(readDraft());
                (0,lodash__WEBPACK_IMPORTED_MODULE_1__.set)(next, path, value);
                setDraft(next);
                showAddField.value = false;
                newField.value = { path: '', type: 'string', value: '' };
                statusMessage.value = '字段已添加到草稿，尚未保存。';
            }
            catch (cause) {
                error.value = `添加失败：${describe(cause)}`;
            }
        }
        (0,vue__WEBPACK_IMPORTED_MODULE_0__.onMounted)(refreshData);
        (0,vue__WEBPACK_IMPORTED_MODULE_0__.onActivated)(() => {
            if (!target.value)
                return;
            try {
                (0,_utils_MvuEditTarget__WEBPACK_IMPORTED_MODULE_4__.assertEditBaseline)(target.value);
            }
            catch (cause) {
                statusMessage.value = '';
                error.value = describe(cause);
            }
        });
        const __returned__ = { store, uiStore, target, currentData, loading, saving, error, statusMessage, editMode, rawJsonString, jsonParseError, searchQuery, showAddField, newField, describe, readDraft, hasChanges, setDraft, validateRawJson, switchToTreeMode, switchToRawMode, formatJson, download, exportDraft, exportRawText, importFile, refreshData, saveData, addField, get targetDescription() { return _utils_MvuEditTarget__WEBPACK_IMPORTED_MODULE_4__.targetDescription; }, JsonTreeEdit: _components_JsonNode_JsonTreeEdit_vue__WEBPACK_IMPORTED_MODULE_6__["default"] };
        Object.defineProperty(__returned__, '__isScriptSetup', { enumerable: false, value: true });
        return __returned__;
    }
}));


/***/ },

/***/ "./node_modules/.pnpm/ts-loader@9.5.4_typescript@_1325e46b45641fb4b445955fad1b3b9a/node_modules/ts-loader/index.js??clonedRuleSet-1!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/components/JsonNode/JsonNodeEdit.vue?vue&type=template&id=2e5fd471&scoped=true&ts=true"
/*!**********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/ts-loader@9.5.4_typescript@_1325e46b45641fb4b445955fad1b3b9a/node_modules/ts-loader/index.js??clonedRuleSet-1!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/components/JsonNode/JsonNodeEdit.vue?vue&type=template&id=2e5fd471&scoped=true&ts=true ***!
  \**********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   render: () => (/* binding */ render)
/* harmony export */ });
/* harmony import */ var vue__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! vue */ "./node_modules/.pnpm/vue@3.5.26_typescript@6.0.0-dev.20250807/node_modules/vue/dist/vue.runtime.esm-bundler.js");

const _hoisted_1 = ["aria-expanded", "aria-label"];
const _hoisted_2 = {
    key: 1,
    class: "space"
};
const _hoisted_3 = {
    key: 2,
    class: "editor-container"
};
const _hoisted_4 = ["aria-label", "onKeydown"];
const _hoisted_5 = ["aria-label", "onKeydown"];
const _hoisted_6 = ["aria-label", "onKeydown"];
const _hoisted_7 = ["aria-label", "onKeydown"];
const _hoisted_8 = {
    key: 3,
    class: "null-value"
};
const _hoisted_9 = ["aria-label"];
const _hoisted_10 = ["aria-label"];
const _hoisted_11 = {
    key: 1,
    class: "preview"
};
const _hoisted_12 = {
    key: 4,
    class: "actions"
};
const _hoisted_13 = ["aria-label"];
const _hoisted_14 = ["aria-label"];
const _hoisted_15 = ["aria-label"];
const _hoisted_16 = {
    key: 0,
    class: "children-container"
};
function render(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_JsonNodeEdit = (0,vue__WEBPACK_IMPORTED_MODULE_0__.resolveComponent)("JsonNodeEdit", true);
    return ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", {
        class: (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["json-node", { 'dark-mode': $setup.uiStore.darkMode }]),
        style: (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeStyle)({ marginLeft: `${$props.node.depth * 20}px` })
    }, [
        (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
            class: (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["line", { 'is-editing': $setup.isEditing }])
        }, [
            (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)(" 折叠/展开箭头 "),
            (!$props.node.isLeaf)
                ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("button", {
                    key: 0,
                    type: "button",
                    class: (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["arrow", { expanded: $props.node.expanded }]),
                    "aria-expanded": $props.node.expanded,
                    "aria-label": `${$props.node.expanded ? '收起' : '展开'} ${$props.node.path}`,
                    onClick: _cache[0] || (_cache[0] = ($event) => ($setup.emit('toggleExpand', $props.node)))
                }, " ▶ ", 10 /* CLASS, PROPS */, _hoisted_1))
                : ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("span", _hoisted_2)),
            (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)(" Key "),
            (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", {
                class: "key",
                onDblclick: $setup.onDoubleClick
            }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($props.node.key) + ":", 33 /* TEXT, NEED_HYDRATION */),
            (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)(" 编辑器 "),
            ($setup.isEditing)
                ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_3, [
                    (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("select", {
                        "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => (($setup.editType) = $event)),
                        class: "edit-select",
                        "aria-label": `${$props.node.path} 的值类型`,
                        onKeydown: (0,vue__WEBPACK_IMPORTED_MODULE_0__.withKeys)((0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)($setup.cancel, ["stop", "prevent"]), ["esc"])
                    }, [...(_cache[13] || (_cache[13] = [
                            (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("option", { value: "string" }, "String", -1 /* CACHED */),
                            (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("option", { value: "number" }, "Number", -1 /* CACHED */),
                            (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("option", { value: "boolean" }, "Boolean", -1 /* CACHED */),
                            (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("option", { value: "null" }, "Null", -1 /* CACHED */)
                        ]))], 40 /* PROPS, NEED_HYDRATION */, _hoisted_4), [
                        [vue__WEBPACK_IMPORTED_MODULE_0__.vModelSelect, $setup.editType]
                    ]),
                    ($setup.editType === 'string')
                        ? (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)(((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("input", {
                            key: 0,
                            ref: "inputRef",
                            "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => (($setup.editValue) = $event)),
                            type: "text",
                            class: "edit-input",
                            "aria-label": `${$props.node.path} 的字符串值`,
                            onKeydown: [
                                (0,vue__WEBPACK_IMPORTED_MODULE_0__.withKeys)($setup.save, ["enter"]),
                                (0,vue__WEBPACK_IMPORTED_MODULE_0__.withKeys)((0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)($setup.cancel, ["stop", "prevent"]), ["esc"])
                            ]
                        }, null, 40 /* PROPS, NEED_HYDRATION */, _hoisted_5)), [
                            [vue__WEBPACK_IMPORTED_MODULE_0__.vModelText, $setup.editValue]
                        ])
                        : ($setup.editType === 'number')
                            ? (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)(((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("input", {
                                key: 1,
                                ref: "inputRef",
                                "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => (($setup.editValue) = $event)),
                                type: "number",
                                class: "edit-input",
                                "aria-label": `${$props.node.path} 的数字值`,
                                onKeydown: [
                                    (0,vue__WEBPACK_IMPORTED_MODULE_0__.withKeys)($setup.save, ["enter"]),
                                    (0,vue__WEBPACK_IMPORTED_MODULE_0__.withKeys)((0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)($setup.cancel, ["stop", "prevent"]), ["esc"])
                                ]
                            }, null, 40 /* PROPS, NEED_HYDRATION */, _hoisted_6)), [
                                [
                                    vue__WEBPACK_IMPORTED_MODULE_0__.vModelText,
                                    $setup.editValue,
                                    void 0,
                                    { number: true }
                                ]
                            ])
                            : ($setup.editType === 'boolean')
                                ? (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)(((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("select", {
                                    key: 2,
                                    ref: "inputRef",
                                    "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => (($setup.editValue) = $event)),
                                    class: "edit-input",
                                    "aria-label": `${$props.node.path} 的布尔值`,
                                    onKeydown: [
                                        (0,vue__WEBPACK_IMPORTED_MODULE_0__.withKeys)($setup.save, ["enter"]),
                                        (0,vue__WEBPACK_IMPORTED_MODULE_0__.withKeys)((0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)($setup.cancel, ["stop", "prevent"]), ["esc"])
                                    ]
                                }, [...(_cache[14] || (_cache[14] = [
                                        (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("option", { value: true }, "true", -1 /* CACHED */),
                                        (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("option", { value: false }, "false", -1 /* CACHED */)
                                    ]))], 40 /* PROPS, NEED_HYDRATION */, _hoisted_7)), [
                                    [vue__WEBPACK_IMPORTED_MODULE_0__.vModelSelect, $setup.editValue]
                                ])
                                : ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("span", _hoisted_8, "null")),
                    (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
                        type: "button",
                        class: "btn-action save",
                        "aria-label": `将 ${$props.node.path} 的编辑应用到草稿`,
                        title: "应用到草稿",
                        onClick: $setup.save
                    }, "✓", 8 /* PROPS */, _hoisted_9),
                    (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
                        type: "button",
                        class: "btn-action cancel",
                        "aria-label": `取消编辑 ${$props.node.path}`,
                        title: "取消编辑",
                        onClick: $setup.cancel
                    }, "✗", 8 /* PROPS */, _hoisted_10)
                ]))
                : ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, { key: 3 }, [
                    (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)(" 值 / 折叠预览 "),
                    ($props.node.isLeaf)
                        ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("span", {
                            key: 0,
                            class: (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["value", $setup.valueClass]),
                            onDblclick: $setup.onDoubleClick
                        }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.formattedValue), 35 /* TEXT, CLASS, NEED_HYDRATION */))
                        : (!$props.node.expanded)
                            ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("span", _hoisted_11, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(Array.isArray($props.node.value) ? `[...]` : `{...}`), 1 /* TEXT */))
                            : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)
                ], 64 /* STABLE_FRAGMENT */)),
            (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)(" 操作按钮 (Flexbox布局) "),
            (!$setup.isEditing)
                ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_12, [
                    (!$props.node.isLeaf)
                        ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("button", {
                            key: 0,
                            type: "button",
                            class: "btn-action",
                            "aria-label": `为 ${$props.node.path} 添加子节点`,
                            title: "添加子节点",
                            onClick: _cache[5] || (_cache[5] = ($event) => ($setup.emit('addChild', { path: $props.node.path, isObject: !Array.isArray($props.node.value) })))
                        }, " + ", 8 /* PROPS */, _hoisted_13))
                        : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true),
                    ($props.node.isLeaf)
                        ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("button", {
                            key: 1,
                            ref: "editButtonRef",
                            type: "button",
                            class: "btn-action",
                            "aria-label": `编辑 ${$props.node.path}`,
                            title: "编辑值",
                            onClick: $setup.startEdit
                        }, "✎", 8 /* PROPS */, _hoisted_14))
                        : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true),
                    (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
                        type: "button",
                        class: "btn-action danger",
                        "aria-label": `删除 ${$props.node.path}`,
                        title: "删除节点",
                        onClick: _cache[6] || (_cache[6] = ($event) => ($setup.emit('removeNode', $props.node.path)))
                    }, "🗑", 8 /* PROPS */, _hoisted_15)
                ]))
                : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)
        ], 2 /* CLASS */),
        (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)(" 子节点 "),
        ($props.node.expanded && $props.node.children)
            ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_16, [
                ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($props.node.children, (child) => {
                    return ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createBlock)(_component_JsonNodeEdit, {
                        key: child.path,
                        node: child,
                        "editing-node-path": $props.editingNodePath,
                        onToggleExpand: _cache[7] || (_cache[7] = ($event) => ($setup.emit('toggleExpand', $event))),
                        onStartEdit: _cache[8] || (_cache[8] = ($event) => ($setup.emit('startEdit', $event))),
                        onCancelEdit: _cache[9] || (_cache[9] = ($event) => ($setup.emit('cancelEdit'))),
                        onSaveEdit: _cache[10] || (_cache[10] = ($event) => ($setup.emit('saveEdit', $event))),
                        onAddChild: _cache[11] || (_cache[11] = ($event) => ($setup.emit('addChild', $event))),
                        onRemoveNode: _cache[12] || (_cache[12] = ($event) => ($setup.emit('removeNode', $event)))
                    }, null, 8 /* PROPS */, ["node", "editing-node-path"]));
                }), 128 /* KEYED_FRAGMENT */))
            ]))
            : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)
    ], 6 /* CLASS, STYLE */));
}


/***/ },

/***/ "./node_modules/.pnpm/ts-loader@9.5.4_typescript@_1325e46b45641fb4b445955fad1b3b9a/node_modules/ts-loader/index.js??clonedRuleSet-1!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/components/JsonNode/JsonTreeEdit.vue?vue&type=template&id=0f813e0d&scoped=true&ts=true"
/*!**********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/ts-loader@9.5.4_typescript@_1325e46b45641fb4b445955fad1b3b9a/node_modules/ts-loader/index.js??clonedRuleSet-1!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/components/JsonNode/JsonTreeEdit.vue?vue&type=template&id=0f813e0d&scoped=true&ts=true ***!
  \**********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   render: () => (/* binding */ render)
/* harmony export */ });
/* harmony import */ var vue__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! vue */ "./node_modules/.pnpm/vue@3.5.26_typescript@6.0.0-dev.20250807/node_modules/vue/dist/vue.runtime.esm-bundler.js");

const _hoisted_1 = {
    key: 0,
    class: "empty-tree"
};
function render(_ctx, _cache, $props, $setup, $data, $options) {
    return ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", {
        class: (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["json-tree", { 'dark-mode': $setup.uiStore.darkMode }])
    }, [
        ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($setup.filteredRoots, (node) => {
            return ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createBlock)($setup["JsonNodeEdit"], {
                key: node.path,
                node: node,
                "editing-node-path": $setup.editingNodePath,
                onToggleExpand: $setup.toggleExpand,
                onStartEdit: $setup.startEdit,
                onCancelEdit: $setup.cancelEdit,
                onSaveEdit: $setup.saveEdit,
                onAddChild: $setup.addChild,
                onRemoveNode: $setup.removeNode
            }, null, 8 /* PROPS */, ["node", "editing-node-path"]));
        }), 128 /* KEYED_FRAGMENT */)),
        ($setup.filteredRoots.length === 0 && $setup.roots.length > 0)
            ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_1, "没有匹配的搜索结果。"))
            : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)
    ], 2 /* CLASS */));
}


/***/ },

/***/ "./node_modules/.pnpm/ts-loader@9.5.4_typescript@_1325e46b45641fb4b445955fad1b3b9a/node_modules/ts-loader/index.js??clonedRuleSet-1!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/view/EraDataEditor.vue?vue&type=template&id=bbcd8a1c&scoped=true&ts=true"
/*!********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/ts-loader@9.5.4_typescript@_1325e46b45641fb4b445955fad1b3b9a/node_modules/ts-loader/index.js??clonedRuleSet-1!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/view/EraDataEditor.vue?vue&type=template&id=bbcd8a1c&scoped=true&ts=true ***!
  \********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   render: () => (/* binding */ render)
/* harmony export */ });
/* harmony import */ var vue__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! vue */ "./node_modules/.pnpm/vue@3.5.26_typescript@6.0.0-dev.20250807/node_modules/vue/dist/vue.runtime.esm-bundler.js");

const _hoisted_1 = { class: "page-heading" };
const _hoisted_2 = { class: "state-badge" };
const _hoisted_3 = {
    class: "target-panel",
    "aria-label": "编辑目标"
};
const _hoisted_4 = { class: "toolbar" };
const _hoisted_5 = ["disabled"];
const _hoisted_6 = ["disabled"];
const _hoisted_7 = ["disabled"];
const _hoisted_8 = { class: "file-button" };
const _hoisted_9 = ["disabled"];
const _hoisted_10 = { class: "file-button" };
const _hoisted_11 = ["disabled"];
const _hoisted_12 = {
    key: 0,
    class: "error notice",
    role: "alert"
};
const _hoisted_13 = {
    key: 1,
    class: "notice",
    role: "status"
};
const _hoisted_14 = {
    key: 2,
    class: "empty-state"
};
const _hoisted_15 = ["disabled"];
const _hoisted_16 = { class: "editor-controls" };
const _hoisted_17 = {
    class: "segmented",
    "aria-label": "编辑方式"
};
const _hoisted_18 = ["aria-pressed"];
const _hoisted_19 = ["aria-pressed"];
const _hoisted_20 = ["disabled"];
const _hoisted_21 = ["aria-expanded"];
const _hoisted_22 = { key: 0 };
const _hoisted_23 = ["placeholder"];
const _hoisted_24 = { class: "search-field" };
const _hoisted_25 = { class: "tree-surface" };
const _hoisted_26 = {
    key: 0,
    class: "hint"
};
const _hoisted_27 = {
    key: 2,
    class: "raw-field"
};
const _hoisted_28 = {
    key: 3,
    class: "error",
    role: "alert"
};
function render(_ctx, _cache, $props, $setup, $data, $options) {
    return ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("section", {
        class: (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["variable-editor", { 'dark-mode': $setup.uiStore.darkMode }]),
        "aria-labelledby": "variable-title"
    }, [
        (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("header", _hoisted_1, [
            _cache[9] || (_cache[9] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", null, [
                (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", { class: "eyebrow" }, "消息变量"),
                (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h2", { id: "variable-title" }, "编辑变量"),
                (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", null, "修改先保留为会话草稿，保存后写入下方绑定的消息。切页和关闭窗口会保留草稿。")
            ], -1 /* CACHED */)),
            (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_2, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.hasChanges ? '草稿未保存' : $setup.target ? '与加载基线一致' : '尚未加载'), 1 /* TEXT */)
        ]),
        (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("section", _hoisted_3, [
            (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("strong", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.target ? $setup.targetDescription($setup.target) : '尚未绑定消息目标'), 1 /* TEXT */),
            _cache[10] || (_cache[10] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", null, "仅修改此消息的 stat_data。出现新楼层、切换聊天 / 消息页或外部变量变化后，旧草稿会停止提交。", -1 /* CACHED */))
        ]),
        (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_4, [
            (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
                disabled: $setup.loading || $setup.saving,
                onClick: $setup.refreshData
            }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.loading ? '正在加载…' : '重新加载目标'), 9 /* TEXT, PROPS */, _hoisted_5),
            (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
                class: "primary",
                disabled: $setup.loading || $setup.saving || !$setup.hasChanges || !$setup.target || !!$setup.jsonParseError,
                onClick: $setup.saveData
            }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.saving ? '保存中…' : '保存变量更改'), 9 /* TEXT, PROPS */, _hoisted_6),
            (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
                disabled: !$setup.currentData || !!$setup.jsonParseError,
                onClick: $setup.exportDraft
            }, "导出当前草稿", 8 /* PROPS */, _hoisted_7),
            ($setup.editMode === 'raw' && $setup.jsonParseError)
                ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("button", {
                    key: 0,
                    onClick: $setup.exportRawText
                }, "保留原始文本"))
                : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true),
            (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", _hoisted_8, [
                _cache[11] || (_cache[11] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)("导入完整数据", -1 /* CACHED */)),
                (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
                    type: "file",
                    accept: ".json,application/json",
                    disabled: $setup.loading || $setup.saving,
                    onChange: _cache[0] || (_cache[0] = ($event) => ($setup.importFile($event, false)))
                }, null, 40 /* PROPS, NEED_HYDRATION */, _hoisted_9)
            ]),
            (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", _hoisted_10, [
                _cache[12] || (_cache[12] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)("导入差分数据", -1 /* CACHED */)),
                (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
                    type: "file",
                    accept: ".json,application/json",
                    disabled: $setup.loading || $setup.saving,
                    onChange: _cache[1] || (_cache[1] = ($event) => ($setup.importFile($event, true)))
                }, null, 40 /* PROPS, NEED_HYDRATION */, _hoisted_11)
            ])
        ]),
        ($setup.error)
            ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_12, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.error), 1 /* TEXT */))
            : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true),
        ($setup.statusMessage)
            ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_13, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.statusMessage), 1 /* TEXT */))
            : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true),
        (!$setup.target && !$setup.loading)
            ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_14, "选择有消息的聊天后，点击“重新加载目标”。加载失败不会清除已有草稿。"))
            : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true),
        ($setup.currentData)
            ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("fieldset", {
                key: 3,
                class: "editing-fields",
                disabled: $setup.saving || $setup.loading
            }, [
                (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_16, [
                    (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_17, [
                        (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
                            class: (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)({ selected: $setup.editMode === 'tree' }),
                            "aria-pressed": $setup.editMode === 'tree',
                            onClick: $setup.switchToTreeMode
                        }, "树形编辑", 10 /* CLASS, PROPS */, _hoisted_18),
                        (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
                            class: (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)({ selected: $setup.editMode === 'raw' }),
                            "aria-pressed": $setup.editMode === 'raw',
                            onClick: $setup.switchToRawMode
                        }, "原始 JSON", 10 /* CLASS, PROPS */, _hoisted_19)
                    ]),
                    ($setup.editMode === 'raw')
                        ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("button", {
                            key: 0,
                            disabled: !!$setup.jsonParseError,
                            onClick: $setup.formatJson
                        }, "格式化 JSON", 8 /* PROPS */, _hoisted_20))
                        : ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("button", {
                            key: 1,
                            "aria-expanded": $setup.showAddField,
                            onClick: _cache[2] || (_cache[2] = ($event) => ($setup.showAddField = !$setup.showAddField))
                        }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.showAddField ? '收起添加字段' : '添加字段'), 9 /* TEXT, PROPS */, _hoisted_21))
                ]),
                ($setup.showAddField && $setup.editMode === 'tree')
                    ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("form", {
                        key: 0,
                        class: "add-field",
                        onSubmit: (0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)($setup.addField, ["prevent"])
                    }, [
                        _cache[17] || (_cache[17] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h3", null, "添加字段", -1 /* CACHED */)),
                        (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", null, [
                            _cache[13] || (_cache[13] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)("字段路径", -1 /* CACHED */)),
                            (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
                                "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => (($setup.newField.path) = $event)),
                                placeholder: "例如：user.info.name",
                                required: ""
                            }, null, 512 /* NEED_PATCH */), [
                                [vue__WEBPACK_IMPORTED_MODULE_0__.vModelText, $setup.newField.path]
                            ])
                        ]),
                        _cache[18] || (_cache[18] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", { class: "hint" }, "用点分隔对象层级；已有路径将被覆盖，仍需保存才会生效。", -1 /* CACHED */)),
                        (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", null, [
                            _cache[15] || (_cache[15] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)("值类型", -1 /* CACHED */)),
                            (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("select", {
                                "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => (($setup.newField.type) = $event))
                            }, [...(_cache[14] || (_cache[14] = [
                                    (0,vue__WEBPACK_IMPORTED_MODULE_0__.createStaticVNode)("<option value=\"string\" data-v-bbcd8a1c>字符串</option><option value=\"number\" data-v-bbcd8a1c>数字</option><option value=\"boolean\" data-v-bbcd8a1c>布尔值</option><option value=\"null\" data-v-bbcd8a1c>null</option><option value=\"object\" data-v-bbcd8a1c>JSON 对象</option><option value=\"array\" data-v-bbcd8a1c>JSON 数组</option>", 6)
                                ]))], 512 /* NEED_PATCH */), [
                                [vue__WEBPACK_IMPORTED_MODULE_0__.vModelSelect, $setup.newField.type]
                            ])
                        ]),
                        ($setup.newField.type !== 'null')
                            ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("label", _hoisted_22, [
                                _cache[16] || (_cache[16] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)("值", -1 /* CACHED */)),
                                (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("textarea", {
                                    "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => (($setup.newField.value) = $event)),
                                    rows: "2",
                                    placeholder: $setup.newField.type === 'boolean' ? 'true 或 false' : $setup.newField.type === 'object' ? '{}' : $setup.newField.type === 'array' ? '[]' : ''
                                }, null, 8 /* PROPS */, _hoisted_23), [
                                    [vue__WEBPACK_IMPORTED_MODULE_0__.vModelText, $setup.newField.value]
                                ])
                            ]))
                            : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true),
                        _cache[19] || (_cache[19] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", { type: "submit" }, "添加到草稿", -1 /* CACHED */))
                    ], 32 /* NEED_HYDRATION */))
                    : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true),
                ($setup.editMode === 'tree')
                    ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, { key: 1 }, [
                        (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", _hoisted_24, [
                            _cache[20] || (_cache[20] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)("搜索路径或值", -1 /* CACHED */)),
                            (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
                                "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => (($setup.searchQuery) = $event)),
                                placeholder: "输入角色名、变量路径或数值…"
                            }, null, 512 /* NEED_PATCH */), [
                                [vue__WEBPACK_IMPORTED_MODULE_0__.vModelText, $setup.searchQuery]
                            ])
                        ]),
                        (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_25, [
                            (0,vue__WEBPACK_IMPORTED_MODULE_0__.createVNode)($setup["JsonTreeEdit"], {
                                data: $setup.currentData,
                                "onUpdate:data": _cache[7] || (_cache[7] = ($event) => (($setup.currentData) = $event)),
                                "search-query": $setup.searchQuery
                            }, null, 8 /* PROPS */, ["data", "search-query"])
                        ]),
                        (!Object.keys($setup.currentData).length)
                            ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_26, "当前是空对象，可添加字段或切到 JSON 编辑。"))
                            : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)
                    ], 64 /* STABLE_FRAGMENT */))
                    : ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("label", _hoisted_27, [
                        _cache[21] || (_cache[21] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)("当前草稿 JSON", -1 /* CACHED */)),
                        (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("textarea", {
                            "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => (($setup.rawJsonString) = $event)),
                            class: "raw-editor",
                            spellcheck: "false",
                            onInput: $setup.validateRawJson
                        }, null, 544 /* NEED_HYDRATION, NEED_PATCH */), [
                            [vue__WEBPACK_IMPORTED_MODULE_0__.vModelText, $setup.rawJsonString]
                        ])
                    ])),
                ($setup.jsonParseError)
                    ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_28, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.jsonParseError) + "。修正后才能保存或导出 JSON；可先保留原始文本。", 1 /* TEXT */))
                    : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)
            ], 8 /* PROPS */, _hoisted_15))
            : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)
    ], 2 /* CLASS */));
}


/***/ },

/***/ "./src/MVU助手/UI/components/JsonNode/JsonNodeEdit.vue"
/*!***********************************************************!*\
  !*** ./src/MVU助手/UI/components/JsonNode/JsonNodeEdit.vue ***!
  \***********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _JsonNodeEdit_vue_vue_type_template_id_2e5fd471_scoped_true_ts_true__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./JsonNodeEdit.vue?vue&type=template&id=2e5fd471&scoped=true&ts=true */ "./src/MVU助手/UI/components/JsonNode/JsonNodeEdit.vue?vue&type=template&id=2e5fd471&scoped=true&ts=true");
/* harmony import */ var _JsonNodeEdit_vue_vue_type_script_setup_true_lang_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./JsonNodeEdit.vue?vue&type=script&setup=true&lang=ts */ "./src/MVU助手/UI/components/JsonNode/JsonNodeEdit.vue?vue&type=script&setup=true&lang=ts");
/* harmony import */ var _JsonNodeEdit_vue_vue_type_style_index_0_id_2e5fd471_scoped_true_lang_scss__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./JsonNodeEdit.vue?vue&type=style&index=0&id=2e5fd471&scoped=true&lang=scss */ "./src/MVU助手/UI/components/JsonNode/JsonNodeEdit.vue?vue&type=style&index=0&id=2e5fd471&scoped=true&lang=scss");
/* harmony import */ var _node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_exportHelper_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../../../node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/exportHelper.js */ "./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/exportHelper.js");




;


const __exports__ = /*#__PURE__*/(0,_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_exportHelper_js__WEBPACK_IMPORTED_MODULE_3__["default"])(_JsonNodeEdit_vue_vue_type_script_setup_true_lang_ts__WEBPACK_IMPORTED_MODULE_1__["default"], [['render',_JsonNodeEdit_vue_vue_type_template_id_2e5fd471_scoped_true_ts_true__WEBPACK_IMPORTED_MODULE_0__.render],['__scopeId',"data-v-2e5fd471"],['__file',"src/MVU助手/UI/components/JsonNode/JsonNodeEdit.vue"]])
/* hot reload */
if (false) // removed by dead control flow
{}


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__exports__);

/***/ },

/***/ "./src/MVU助手/UI/components/JsonNode/JsonNodeEdit.vue?vue&type=script&setup=true&lang=ts"
/*!**********************************************************************************************!*\
  !*** ./src/MVU助手/UI/components/JsonNode/JsonNodeEdit.vue?vue&type=script&setup=true&lang=ts ***!
  \**********************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* reexport safe */ _node_modules_pnpm_ts_loader_9_5_4_typescript_1325e46b45641fb4b445955fad1b3b9a_node_modules_ts_loader_index_js_clonedRuleSet_1_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_5_use_0_JsonNodeEdit_vue_vue_type_script_setup_true_lang_ts__WEBPACK_IMPORTED_MODULE_0__["default"])
/* harmony export */ });
/* harmony import */ var _node_modules_pnpm_ts_loader_9_5_4_typescript_1325e46b45641fb4b445955fad1b3b9a_node_modules_ts_loader_index_js_clonedRuleSet_1_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_5_use_0_JsonNodeEdit_vue_vue_type_script_setup_true_lang_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! -!../../../../../node_modules/.pnpm/ts-loader@9.5.4_typescript@_1325e46b45641fb4b445955fad1b3b9a/node_modules/ts-loader/index.js??clonedRuleSet-1!../../../../../node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./JsonNodeEdit.vue?vue&type=script&setup=true&lang=ts */ "./node_modules/.pnpm/ts-loader@9.5.4_typescript@_1325e46b45641fb4b445955fad1b3b9a/node_modules/ts-loader/index.js??clonedRuleSet-1!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/components/JsonNode/JsonNodeEdit.vue?vue&type=script&setup=true&lang=ts");
 

/***/ },

/***/ "./src/MVU助手/UI/components/JsonNode/JsonNodeEdit.vue?vue&type=style&index=0&id=2e5fd471&scoped=true&lang=scss"
/*!********************************************************************************************************************!*\
  !*** ./src/MVU助手/UI/components/JsonNode/JsonNodeEdit.vue?vue&type=style&index=0&id=2e5fd471&scoped=true&lang=scss ***!
  \********************************************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_cjs_js_node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_stylePostLoader_js_node_modules_pnpm_sass_loader_16_0_6_sass_1_97_2_webpack_5_104_1_node_modules_sass_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_5_use_0_JsonNodeEdit_vue_vue_type_style_index_0_id_2e5fd471_scoped_true_lang_scss__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! -!../../../../../node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/cjs.js!../../../../../node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/cjs.js!../../../../../node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/stylePostLoader.js!../../../../../node_modules/.pnpm/sass-loader@16.0.6_sass@1.97.2_webpack@5.104.1/node_modules/sass-loader/dist/cjs.js!../../../../../node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./JsonNodeEdit.vue?vue&type=style&index=0&id=2e5fd471&scoped=true&lang=scss */ "./node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/cjs.js!./node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/.pnpm/sass-loader@16.0.6_sass@1.97.2_webpack@5.104.1/node_modules/sass-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/components/JsonNode/JsonNodeEdit.vue?vue&type=style&index=0&id=2e5fd471&scoped=true&lang=scss");


/***/ },

/***/ "./src/MVU助手/UI/components/JsonNode/JsonNodeEdit.vue?vue&type=template&id=2e5fd471&scoped=true&ts=true"
/*!*************************************************************************************************************!*\
  !*** ./src/MVU助手/UI/components/JsonNode/JsonNodeEdit.vue?vue&type=template&id=2e5fd471&scoped=true&ts=true ***!
  \*************************************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   render: () => (/* reexport safe */ _node_modules_pnpm_ts_loader_9_5_4_typescript_1325e46b45641fb4b445955fad1b3b9a_node_modules_ts_loader_index_js_clonedRuleSet_1_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_templateLoader_js_ruleSet_1_rules_2_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_5_use_0_JsonNodeEdit_vue_vue_type_template_id_2e5fd471_scoped_true_ts_true__WEBPACK_IMPORTED_MODULE_0__.render)
/* harmony export */ });
/* harmony import */ var _node_modules_pnpm_ts_loader_9_5_4_typescript_1325e46b45641fb4b445955fad1b3b9a_node_modules_ts_loader_index_js_clonedRuleSet_1_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_templateLoader_js_ruleSet_1_rules_2_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_5_use_0_JsonNodeEdit_vue_vue_type_template_id_2e5fd471_scoped_true_ts_true__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! -!../../../../../node_modules/.pnpm/ts-loader@9.5.4_typescript@_1325e46b45641fb4b445955fad1b3b9a/node_modules/ts-loader/index.js??clonedRuleSet-1!../../../../../node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!../../../../../node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./JsonNodeEdit.vue?vue&type=template&id=2e5fd471&scoped=true&ts=true */ "./node_modules/.pnpm/ts-loader@9.5.4_typescript@_1325e46b45641fb4b445955fad1b3b9a/node_modules/ts-loader/index.js??clonedRuleSet-1!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/components/JsonNode/JsonNodeEdit.vue?vue&type=template&id=2e5fd471&scoped=true&ts=true");


/***/ },

/***/ "./src/MVU助手/UI/components/JsonNode/JsonTreeEdit.vue"
/*!***********************************************************!*\
  !*** ./src/MVU助手/UI/components/JsonNode/JsonTreeEdit.vue ***!
  \***********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _JsonTreeEdit_vue_vue_type_template_id_0f813e0d_scoped_true_ts_true__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./JsonTreeEdit.vue?vue&type=template&id=0f813e0d&scoped=true&ts=true */ "./src/MVU助手/UI/components/JsonNode/JsonTreeEdit.vue?vue&type=template&id=0f813e0d&scoped=true&ts=true");
/* harmony import */ var _JsonTreeEdit_vue_vue_type_script_setup_true_lang_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./JsonTreeEdit.vue?vue&type=script&setup=true&lang=ts */ "./src/MVU助手/UI/components/JsonNode/JsonTreeEdit.vue?vue&type=script&setup=true&lang=ts");
/* harmony import */ var _JsonTreeEdit_vue_vue_type_style_index_0_id_0f813e0d_scoped_true_lang_scss__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./JsonTreeEdit.vue?vue&type=style&index=0&id=0f813e0d&scoped=true&lang=scss */ "./src/MVU助手/UI/components/JsonNode/JsonTreeEdit.vue?vue&type=style&index=0&id=0f813e0d&scoped=true&lang=scss");
/* harmony import */ var _node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_exportHelper_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../../../node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/exportHelper.js */ "./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/exportHelper.js");




;


const __exports__ = /*#__PURE__*/(0,_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_exportHelper_js__WEBPACK_IMPORTED_MODULE_3__["default"])(_JsonTreeEdit_vue_vue_type_script_setup_true_lang_ts__WEBPACK_IMPORTED_MODULE_1__["default"], [['render',_JsonTreeEdit_vue_vue_type_template_id_0f813e0d_scoped_true_ts_true__WEBPACK_IMPORTED_MODULE_0__.render],['__scopeId',"data-v-0f813e0d"],['__file',"src/MVU助手/UI/components/JsonNode/JsonTreeEdit.vue"]])
/* hot reload */
if (false) // removed by dead control flow
{}


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__exports__);

/***/ },

/***/ "./src/MVU助手/UI/components/JsonNode/JsonTreeEdit.vue?vue&type=script&setup=true&lang=ts"
/*!**********************************************************************************************!*\
  !*** ./src/MVU助手/UI/components/JsonNode/JsonTreeEdit.vue?vue&type=script&setup=true&lang=ts ***!
  \**********************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* reexport safe */ _node_modules_pnpm_ts_loader_9_5_4_typescript_1325e46b45641fb4b445955fad1b3b9a_node_modules_ts_loader_index_js_clonedRuleSet_1_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_5_use_0_JsonTreeEdit_vue_vue_type_script_setup_true_lang_ts__WEBPACK_IMPORTED_MODULE_0__["default"])
/* harmony export */ });
/* harmony import */ var _node_modules_pnpm_ts_loader_9_5_4_typescript_1325e46b45641fb4b445955fad1b3b9a_node_modules_ts_loader_index_js_clonedRuleSet_1_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_5_use_0_JsonTreeEdit_vue_vue_type_script_setup_true_lang_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! -!../../../../../node_modules/.pnpm/ts-loader@9.5.4_typescript@_1325e46b45641fb4b445955fad1b3b9a/node_modules/ts-loader/index.js??clonedRuleSet-1!../../../../../node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./JsonTreeEdit.vue?vue&type=script&setup=true&lang=ts */ "./node_modules/.pnpm/ts-loader@9.5.4_typescript@_1325e46b45641fb4b445955fad1b3b9a/node_modules/ts-loader/index.js??clonedRuleSet-1!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/components/JsonNode/JsonTreeEdit.vue?vue&type=script&setup=true&lang=ts");
 

/***/ },

/***/ "./src/MVU助手/UI/components/JsonNode/JsonTreeEdit.vue?vue&type=style&index=0&id=0f813e0d&scoped=true&lang=scss"
/*!********************************************************************************************************************!*\
  !*** ./src/MVU助手/UI/components/JsonNode/JsonTreeEdit.vue?vue&type=style&index=0&id=0f813e0d&scoped=true&lang=scss ***!
  \********************************************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_cjs_js_node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_stylePostLoader_js_node_modules_pnpm_sass_loader_16_0_6_sass_1_97_2_webpack_5_104_1_node_modules_sass_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_5_use_0_JsonTreeEdit_vue_vue_type_style_index_0_id_0f813e0d_scoped_true_lang_scss__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! -!../../../../../node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/cjs.js!../../../../../node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/cjs.js!../../../../../node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/stylePostLoader.js!../../../../../node_modules/.pnpm/sass-loader@16.0.6_sass@1.97.2_webpack@5.104.1/node_modules/sass-loader/dist/cjs.js!../../../../../node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./JsonTreeEdit.vue?vue&type=style&index=0&id=0f813e0d&scoped=true&lang=scss */ "./node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/cjs.js!./node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/.pnpm/sass-loader@16.0.6_sass@1.97.2_webpack@5.104.1/node_modules/sass-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/components/JsonNode/JsonTreeEdit.vue?vue&type=style&index=0&id=0f813e0d&scoped=true&lang=scss");


/***/ },

/***/ "./src/MVU助手/UI/components/JsonNode/JsonTreeEdit.vue?vue&type=template&id=0f813e0d&scoped=true&ts=true"
/*!*************************************************************************************************************!*\
  !*** ./src/MVU助手/UI/components/JsonNode/JsonTreeEdit.vue?vue&type=template&id=0f813e0d&scoped=true&ts=true ***!
  \*************************************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   render: () => (/* reexport safe */ _node_modules_pnpm_ts_loader_9_5_4_typescript_1325e46b45641fb4b445955fad1b3b9a_node_modules_ts_loader_index_js_clonedRuleSet_1_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_templateLoader_js_ruleSet_1_rules_2_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_5_use_0_JsonTreeEdit_vue_vue_type_template_id_0f813e0d_scoped_true_ts_true__WEBPACK_IMPORTED_MODULE_0__.render)
/* harmony export */ });
/* harmony import */ var _node_modules_pnpm_ts_loader_9_5_4_typescript_1325e46b45641fb4b445955fad1b3b9a_node_modules_ts_loader_index_js_clonedRuleSet_1_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_templateLoader_js_ruleSet_1_rules_2_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_5_use_0_JsonTreeEdit_vue_vue_type_template_id_0f813e0d_scoped_true_ts_true__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! -!../../../../../node_modules/.pnpm/ts-loader@9.5.4_typescript@_1325e46b45641fb4b445955fad1b3b9a/node_modules/ts-loader/index.js??clonedRuleSet-1!../../../../../node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!../../../../../node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./JsonTreeEdit.vue?vue&type=template&id=0f813e0d&scoped=true&ts=true */ "./node_modules/.pnpm/ts-loader@9.5.4_typescript@_1325e46b45641fb4b445955fad1b3b9a/node_modules/ts-loader/index.js??clonedRuleSet-1!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/components/JsonNode/JsonTreeEdit.vue?vue&type=template&id=0f813e0d&scoped=true&ts=true");


/***/ },

/***/ "./src/MVU助手/UI/view/EraDataEditor.vue"
/*!*********************************************!*\
  !*** ./src/MVU助手/UI/view/EraDataEditor.vue ***!
  \*********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _EraDataEditor_vue_vue_type_template_id_bbcd8a1c_scoped_true_ts_true__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./EraDataEditor.vue?vue&type=template&id=bbcd8a1c&scoped=true&ts=true */ "./src/MVU助手/UI/view/EraDataEditor.vue?vue&type=template&id=bbcd8a1c&scoped=true&ts=true");
/* harmony import */ var _EraDataEditor_vue_vue_type_script_setup_true_lang_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./EraDataEditor.vue?vue&type=script&setup=true&lang=ts */ "./src/MVU助手/UI/view/EraDataEditor.vue?vue&type=script&setup=true&lang=ts");
/* harmony import */ var _EraDataEditor_vue_vue_type_style_index_0_id_bbcd8a1c_scoped_true_lang_scss__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./EraDataEditor.vue?vue&type=style&index=0&id=bbcd8a1c&scoped=true&lang=scss */ "./src/MVU助手/UI/view/EraDataEditor.vue?vue&type=style&index=0&id=bbcd8a1c&scoped=true&lang=scss");
/* harmony import */ var _node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_exportHelper_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../../node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/exportHelper.js */ "./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/exportHelper.js");




;


const __exports__ = /*#__PURE__*/(0,_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_exportHelper_js__WEBPACK_IMPORTED_MODULE_3__["default"])(_EraDataEditor_vue_vue_type_script_setup_true_lang_ts__WEBPACK_IMPORTED_MODULE_1__["default"], [['render',_EraDataEditor_vue_vue_type_template_id_bbcd8a1c_scoped_true_ts_true__WEBPACK_IMPORTED_MODULE_0__.render],['__scopeId',"data-v-bbcd8a1c"],['__file',"src/MVU助手/UI/view/EraDataEditor.vue"]])
/* hot reload */
if (false) // removed by dead control flow
{}


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__exports__);

/***/ },

/***/ "./src/MVU助手/UI/view/EraDataEditor.vue?vue&type=script&setup=true&lang=ts"
/*!********************************************************************************!*\
  !*** ./src/MVU助手/UI/view/EraDataEditor.vue?vue&type=script&setup=true&lang=ts ***!
  \********************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* reexport safe */ _node_modules_pnpm_ts_loader_9_5_4_typescript_1325e46b45641fb4b445955fad1b3b9a_node_modules_ts_loader_index_js_clonedRuleSet_1_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_5_use_0_EraDataEditor_vue_vue_type_script_setup_true_lang_ts__WEBPACK_IMPORTED_MODULE_0__["default"])
/* harmony export */ });
/* harmony import */ var _node_modules_pnpm_ts_loader_9_5_4_typescript_1325e46b45641fb4b445955fad1b3b9a_node_modules_ts_loader_index_js_clonedRuleSet_1_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_5_use_0_EraDataEditor_vue_vue_type_script_setup_true_lang_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! -!../../../../node_modules/.pnpm/ts-loader@9.5.4_typescript@_1325e46b45641fb4b445955fad1b3b9a/node_modules/ts-loader/index.js??clonedRuleSet-1!../../../../node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./EraDataEditor.vue?vue&type=script&setup=true&lang=ts */ "./node_modules/.pnpm/ts-loader@9.5.4_typescript@_1325e46b45641fb4b445955fad1b3b9a/node_modules/ts-loader/index.js??clonedRuleSet-1!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/view/EraDataEditor.vue?vue&type=script&setup=true&lang=ts");
 

/***/ },

/***/ "./src/MVU助手/UI/view/EraDataEditor.vue?vue&type=style&index=0&id=bbcd8a1c&scoped=true&lang=scss"
/*!******************************************************************************************************!*\
  !*** ./src/MVU助手/UI/view/EraDataEditor.vue?vue&type=style&index=0&id=bbcd8a1c&scoped=true&lang=scss ***!
  \******************************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _node_modules_pnpm_style_loader_4_0_0_webpack_5_104_1_node_modules_style_loader_dist_cjs_js_node_modules_pnpm_css_loader_7_1_2_webpack_5_104_1_node_modules_css_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_stylePostLoader_js_node_modules_pnpm_sass_loader_16_0_6_sass_1_97_2_webpack_5_104_1_node_modules_sass_loader_dist_cjs_js_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_5_use_0_EraDataEditor_vue_vue_type_style_index_0_id_bbcd8a1c_scoped_true_lang_scss__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! -!../../../../node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/cjs.js!../../../../node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/cjs.js!../../../../node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/stylePostLoader.js!../../../../node_modules/.pnpm/sass-loader@16.0.6_sass@1.97.2_webpack@5.104.1/node_modules/sass-loader/dist/cjs.js!../../../../node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./EraDataEditor.vue?vue&type=style&index=0&id=bbcd8a1c&scoped=true&lang=scss */ "./node_modules/.pnpm/style-loader@4.0.0_webpack@5.104.1/node_modules/style-loader/dist/cjs.js!./node_modules/.pnpm/css-loader@7.1.2_webpack@5.104.1/node_modules/css-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/.pnpm/sass-loader@16.0.6_sass@1.97.2_webpack@5.104.1/node_modules/sass-loader/dist/cjs.js!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/view/EraDataEditor.vue?vue&type=style&index=0&id=bbcd8a1c&scoped=true&lang=scss");


/***/ },

/***/ "./src/MVU助手/UI/view/EraDataEditor.vue?vue&type=template&id=bbcd8a1c&scoped=true&ts=true"
/*!***********************************************************************************************!*\
  !*** ./src/MVU助手/UI/view/EraDataEditor.vue?vue&type=template&id=bbcd8a1c&scoped=true&ts=true ***!
  \***********************************************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   render: () => (/* reexport safe */ _node_modules_pnpm_ts_loader_9_5_4_typescript_1325e46b45641fb4b445955fad1b3b9a_node_modules_ts_loader_index_js_clonedRuleSet_1_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_templateLoader_js_ruleSet_1_rules_2_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_5_use_0_EraDataEditor_vue_vue_type_template_id_bbcd8a1c_scoped_true_ts_true__WEBPACK_IMPORTED_MODULE_0__.render)
/* harmony export */ });
/* harmony import */ var _node_modules_pnpm_ts_loader_9_5_4_typescript_1325e46b45641fb4b445955fad1b3b9a_node_modules_ts_loader_index_js_clonedRuleSet_1_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_templateLoader_js_ruleSet_1_rules_2_node_modules_pnpm_vue_loader_17_4_2_vue_3_5_2_fcc8164c33ab268660e3819796c9f485_node_modules_vue_loader_dist_index_js_ruleSet_1_rules_5_use_0_EraDataEditor_vue_vue_type_template_id_bbcd8a1c_scoped_true_ts_true__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! -!../../../../node_modules/.pnpm/ts-loader@9.5.4_typescript@_1325e46b45641fb4b445955fad1b3b9a/node_modules/ts-loader/index.js??clonedRuleSet-1!../../../../node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!../../../../node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./EraDataEditor.vue?vue&type=template&id=bbcd8a1c&scoped=true&ts=true */ "./node_modules/.pnpm/ts-loader@9.5.4_typescript@_1325e46b45641fb4b445955fad1b3b9a/node_modules/ts-loader/index.js??clonedRuleSet-1!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/.pnpm/vue-loader@17.4.2_vue@3.5.2_fcc8164c33ab268660e3819796c9f485/node_modules/vue-loader/dist/index.js??ruleSet[1].rules[5].use[0]!./src/MVU助手/UI/view/EraDataEditor.vue?vue&type=template&id=bbcd8a1c&scoped=true&ts=true");


/***/ },

/***/ "./src/MVU助手/stores/EraEditStore.ts"
/*!******************************************!*\
  !*** ./src/MVU助手/stores/EraEditStore.ts ***!
  \******************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   useEraEditStore: () => (/* binding */ useEraEditStore)
/* harmony export */ });
/* harmony import */ var pinia__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! pinia */ "./node_modules/.pnpm/pinia@3.0.4_typescript@6.0._1035626c717f138a4ca30621e1ecb91e/node_modules/pinia/dist/pinia.mjs");
/* harmony import */ var _utils_MvuEditTarget__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils/MvuEditTarget */ "./src/MVU助手/utils/MvuEditTarget.ts");


const useEraEditStore = (0,pinia__WEBPACK_IMPORTED_MODULE_0__.defineStore)('KatEraEdit', () => {
    const getStatData = async () => (await (0,_utils_MvuEditTarget__WEBPACK_IMPORTED_MODULE_1__.captureEditTarget)()).baseline;
    const loadTarget = _utils_MvuEditTarget__WEBPACK_IMPORTED_MODULE_1__.captureEditTarget;
    const saveEraEdit = (object, target) => (0,_utils_MvuEditTarget__WEBPACK_IMPORTED_MODULE_1__.saveEditTarget)(target, object);
    return { getStatData, loadTarget, saveEraEdit };
});


/***/ }

}]);