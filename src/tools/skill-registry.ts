export type SkillRegistryEntry = {
  id: string;
  aliases: string[];
  category: string;
  summary: string;
  output_targets: string[];
};

export const skillRegistry: SkillRegistryEntry[] = [
  {
    id: "clock_rcc_init",
    aliases: ["stm32_clock_and_rcc_init", "rcc_init", "clock_init"],
    category: "core",
    summary: "System clock tree and RCC enable sequence.",
    output_targets: ["SystemClock_Config", "clock_config_block"]
  },
  {
    id: "gpio_configuration",
    aliases: ["stm32_gpio_configuration", "gpio_init", "gpio_led"],
    category: "peripheral",
    summary: "GPIO pin configuration and output behavior.",
    output_targets: ["MX_GPIO_Init", "gpio_user_block"]
  },
  {
    id: "usart_configuration",
    aliases: ["stm32_usart_configuration", "uart", "usart1_init"],
    category: "peripheral",
    summary: "USART/UART initialization and transmit support.",
    output_targets: ["MX_USART1_UART_Init", "uart_user_block"]
  },
  {
    id: "systick_non_blocking_timing",
    aliases: ["stm32_non_blocking_timing_with_systick", "systick_timing", "timer_tick"],
    category: "timing",
    summary: "Millisecond tick based non-blocking timing logic.",
    output_targets: ["SysTick_Handler", "main_loop_tick_logic"]
  },
  {
    id: "keil_project_integration",
    aliases: ["keil_uv4_project_integration", "keil_build", "uv4_integration"],
    category: "toolchain",
    summary: "Keil project integration, build, flash, and runtime verify handoff.",
    output_targets: ["uvprojx", "flash_verify_config", "runtime_verify"]
  },
  {
    id: "adc_sampling",
    aliases: ["adc", "adc_init", "adc_sampling"],
    category: "peripheral",
    summary: "ADC setup, channel selection, conversion and filtering.",
    output_targets: ["MX_ADC_Init", "adc_user_block"]
  },
  {
    id: "dac_output",
    aliases: ["dac", "dac_init", "dac_output"],
    category: "peripheral",
    summary: "DAC initialization and analog output mapping.",
    output_targets: ["MX_DAC_Init", "dac_user_block"]
  },
  {
    id: "pid_control",
    aliases: ["pid", "pi", "pid_control"],
    category: "control",
    summary: "PI/PID control loop scaffolding and parameter hooks.",
    output_targets: ["control_loop_block", "pid_user_block"]
  }
];
