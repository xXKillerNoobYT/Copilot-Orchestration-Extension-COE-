export interface ColorTheme {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  border: string;
}

export interface FontOption {
  id: string;
  name: string;
  family: string;
  weights: number[];
}

export interface ComponentStyle {
  borderRadius: string;
  padding: string;
  shadow: string;
}

export interface PageSection {
  id: string;
  title: string;
  content: string;
  visible: boolean;
}

export interface DesignSystemState {
  selectedTheme: ColorTheme;
  selectedFont: FontOption;
  componentStyle: ComponentStyle;
  pageSections: PageSection[];
}
