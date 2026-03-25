export {}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "mux-player": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        [key: string]: any
      }
    }
  }
}
