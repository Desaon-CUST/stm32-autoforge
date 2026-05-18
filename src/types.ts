export type Stm32ProjectProfile = {
  project: string;
  mcu?: string;
  board?: string;
  toolchain?: string;
  features: string[];
};

export type ToolResult = {
  title: string;
  body: string;
};

export type IocAnalyzeInput = {
  file: string;
};

export type TaskModule = {
  name: string;
  [key: string]: string | number | boolean | string[] | number[] | undefined;
};

export type ToolchainConfig = {
  type: string;
  uv4_path?: string;
  project_path?: string;
  target_name?: string;
};

export type RuntimeVerifyConfig = {
  serial_port?: string;
  baud_rate?: number;
  timeout_s?: number;
  expect_keywords?: string[];
};

export type TaskConfig = {
  task_name: string;
  description?: string;
  board?: string;
  mcu: string;
  toolchain: ToolchainConfig;
  required_modules: TaskModule[];
  runtime_verify?: RuntimeVerifyConfig;
  reference_files?: string[];
};

export type TaskParseInput = {
  file: string;
};

export type TaskToFlashConfigInput = {
  task: string;
  out?: string;
};

export type AiPlanParseInput = {
  task: string;
  ai: string;
  out?: string;
};

export type AiToDesignJsonInput = {
  task: string;
  ai: string;
  out?: string;
};

export type CubemxGenerateInput = {
  design: string;
  out?: string;
  cubemx?: string;
  python?: string;
  timeout_s?: number;
  dry_run?: boolean;
};

export type FlashVerifyConfig = {
  project_name?: string;
  board?: string;
  mcu?: string;
  build: {
    tool: string;
    uv4_path: string;
    project_path: string;
    target_name: string;
  };
  flash?: {
    tool?: string;
    use_keil_download?: boolean;
    project_path?: string;
    target_name?: string;
  };
  verify_runtime?: {
    method?: string;
    port?: string;
    baudrate?: number;
    expect_text?: string;
  };
};

export type FlashVerifyInput = {
  config: string;
  script?: string;
  python?: string;
  run?: boolean;
  report?: string;
};

export type ApplyCodegenPlanInput = {
  codegen: string;
  project?: string;
  main?: string;
  out?: string;
};

export type KeilConfigureDownloadInput = {
  project: string;
  monitor?: string;
  algorithm?: string;
  report?: string;
};
