// eslint-disable-next-line spaced-comment -- Vite 类型引用只能是三斜线指令，格式改不了
/// <reference types="vite/client" />

declare module '*.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
