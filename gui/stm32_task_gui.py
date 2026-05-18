import json
import os
import subprocess
import threading
import time
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, ttk


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_STM32_PROJECTS_DIR = Path(r"D:\sofrware project\AI try\stm32工程")
DEFAULT_TSX = Path(r"D:\sofrware project\AI try\claude-code-main\claude-code-main\node_modules\.bin\tsx.cmd")
DEFAULT_CODEX = Path(os.environ.get("APPDATA", "")) / "npm" / "codex.cmd"
DEFAULT_PYTHON = Path(r"D:\MentorGraphics\PADSProVX.2.7\SDD_HOME\hyperlynx64\EM\nWaveHL\Scripting\python.exe")
DEFAULT_CUBEMX = Path(r"D:\Program Files\STMicroelectronics\STM32Cube\STM32CubeMX\STM32CubeMX.exe")
SETTINGS_FILE = PROJECT_ROOT / "workspace-output" / "gui_state.json"
DEFAULT_UV4 = Path(r"D:\Keil_v5\UV4\UV4.exe")


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("STM32 Full-Flow AI")
        self.geometry("1180x860")

        self.task_name = tk.StringVar(value="stm32_task")
        self.board = tk.StringVar(value="ALIENTEK_STM32F103_Elite_V2")
        self.mcu = tk.StringVar(value="STM32F103ZET6")
        self.uv4_path = tk.StringVar(value=str(DEFAULT_UV4))
        self.project_path = tk.StringVar()
        self.target_name = tk.StringVar(value="Target 1")
        self.serial_port = tk.StringVar(value="COM10")
        self.baud_rate = tk.StringVar(value="115200")
        self.expect_keyword = tk.StringVar(value="OK")
        self.keil_monitor = tk.StringVar(value=r"BIN\CMSIS_AGDI.dll")
        self.flash_algorithm = tk.StringVar(value=r"$$Device:STM32F103ZE$Flash\STM32F10x_512.FLM")
        self.output_dir = tk.StringVar(value=str(DEFAULT_STM32_PROJECTS_DIR))
        self.workspace_dir = tk.StringVar(value=str(PROJECT_ROOT))
        self.model = tk.StringVar(value="gpt-5.3-codex")
        self.tsx_path = tk.StringVar(value=str(DEFAULT_TSX))
        self.codex_path = tk.StringVar(value=str(DEFAULT_CODEX))
        self.cubemx_path = tk.StringVar(value=str(DEFAULT_CUBEMX))
        self.python_path = tk.StringVar(value=str(DEFAULT_PYTHON))
        self.status_text = tk.StringVar(value="Idle")
        self.step_text = tk.StringVar(value="Step: idle")
        self.progress_text = tk.StringVar(value="0/0")
        self.show_advanced = tk.BooleanVar(value=False)
        self.progress_steps = []
        self.progress_done = set()

        self.reference_files: list[str] = []

        self._load_state()
        self._build_ui()
        self._ensure_output_dir()

    def _build_ui(self):
        root = ttk.Frame(self, padding=10)
        root.pack(fill=tk.BOTH, expand=True)

        top = ttk.Frame(root)
        top.pack(fill=tk.X)

        left = ttk.LabelFrame(top, text="Task Input", padding=10)
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 8))

        right = ttk.LabelFrame(top, text="Paths And Runtime", padding=10)
        right.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self._add_labeled_entry(left, "Task Name", self.task_name, 0)
        self._add_labeled_entry(left, "Board", self.board, 1)
        self._add_labeled_entry(left, "MCU", self.mcu, 2)

        ttk.Label(left, text="Requirement Description").grid(row=3, column=0, sticky="nw", pady=(8, 4))
        self.description_text = tk.Text(left, height=10, wrap=tk.WORD)
        self.description_text.grid(row=3, column=1, sticky="nsew", pady=(8, 4))
        self.description_text.insert(
            "1.0",
            "Describe the STM32 requirement here. Example: configure USART1 at 115200, blink PC13 every 500 ms, and verify runtime output contains OK."
        )

        ttk.Label(left, text="Required Modules (one per line)").grid(row=4, column=0, sticky="nw", pady=(8, 4))
        self.modules_text = tk.Text(left, height=8, wrap=tk.WORD)
        self.modules_text.grid(row=4, column=1, sticky="nsew", pady=(8, 4))
        self.modules_text.insert(
            "1.0",
            "uart,instance=USART1,tx_pin=PA9,rx_pin=PA10,baud_rate=115200,format=8N1,runtime_output=OK\n"
            "gpio_led,pin=PC13,period_ms=500"
        )

        left.columnconfigure(1, weight=1)
        left.rowconfigure(3, weight=1)
        left.rowconfigure(4, weight=1)

        self._add_path_row(right, "UV4 Path", self.uv4_path, 0, pick_file=True)
        self._add_path_row(right, "Project Path", self.project_path, 1, pick_file=True)
        self._add_labeled_entry(right, "Target Name", self.target_name, 2)
        self._add_labeled_entry(right, "Serial Port", self.serial_port, 3)
        self._add_labeled_entry(right, "Baud Rate", self.baud_rate, 4)
        self._add_labeled_entry(right, "Expect Keyword", self.expect_keyword, 5)
        self._add_labeled_entry(right, "Keil Monitor", self.keil_monitor, 6)
        self._add_labeled_entry(right, "Flash Algorithm", self.flash_algorithm, 7)
        self._add_path_row(right, "Output Folder", self.output_dir, 8, pick_dir=True)
        self._add_path_row(right, "Workspace Dir", self.workspace_dir, 9, pick_dir=True)
        self._add_labeled_entry(right, "Model", self.model, 10)

        ttk.Checkbutton(
            right,
            text="Show Advanced Paths",
            variable=self.show_advanced,
            command=self.toggle_advanced
        ).grid(row=11, column=0, columnspan=3, sticky="w", pady=(8, 4))

        self.advanced_frame = ttk.Frame(right)
        self.advanced_frame.grid(row=12, column=0, columnspan=3, sticky="ew")
        self._add_path_row(self.advanced_frame, "TSX Path", self.tsx_path, 0, pick_file=True)
        self._add_path_row(self.advanced_frame, "Codex Path", self.codex_path, 1, pick_file=True)
        self._add_path_row(self.advanced_frame, "CubeMX Path", self.cubemx_path, 2, pick_file=True)
        self._add_path_row(self.advanced_frame, "Python Path", self.python_path, 3, pick_file=True)
        self.toggle_advanced()

        ref_frame = ttk.LabelFrame(root, text="Reference Files", padding=10)
        ref_frame.pack(fill=tk.BOTH, expand=False, pady=8)

        self.ref_list = tk.Listbox(ref_frame, height=6)
        self.ref_list.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        ref_buttons = ttk.Frame(ref_frame)
        ref_buttons.pack(side=tk.LEFT, fill=tk.Y, padx=(8, 0))
        ttk.Button(ref_buttons, text="Add File", command=self.add_reference_file).pack(fill=tk.X)
        ttk.Button(ref_buttons, text="Remove Selected", command=self.remove_reference_file).pack(fill=tk.X, pady=6)
        ttk.Button(ref_buttons, text="Add Project Path", command=self.add_project_as_reference).pack(fill=tk.X)

        action = ttk.Frame(root)
        action.pack(fill=tk.X, pady=(0, 8))
        ttk.Button(action, text="Save Task JSON", command=self.save_task_json).pack(side=tk.LEFT)
        ttk.Button(action, text="Run Pipeline", command=self.run_pipeline).pack(side=tk.LEFT, padx=6)
        ttk.Button(action, text="Send To ChatGPT", command=self.send_to_chatgpt).pack(side=tk.LEFT)
        ttk.Button(action, text="Run All", command=self.run_all).pack(side=tk.LEFT, padx=6)
        ttk.Label(action, textvariable=self.status_text).pack(side=tk.RIGHT)

        progress_frame = ttk.LabelFrame(root, text="Progress", padding=10)
        progress_frame.pack(fill=tk.X, pady=(0, 8))

        progress_top = ttk.Frame(progress_frame)
        progress_top.pack(fill=tk.X)
        ttk.Label(progress_top, textvariable=self.step_text).pack(side=tk.LEFT)
        ttk.Label(progress_top, textvariable=self.progress_text).pack(side=tk.RIGHT)

        self.progress_bar = ttk.Progressbar(progress_frame, mode="determinate", maximum=100)
        self.progress_bar.pack(fill=tk.X, pady=(6, 8))

        self.progress_list = tk.Listbox(progress_frame, height=8)
        self.progress_list.pack(fill=tk.X)

        log_frame = ttk.LabelFrame(root, text="Log", padding=10)
        log_frame.pack(fill=tk.BOTH, expand=True)
        self.log_text = tk.Text(log_frame, wrap=tk.WORD)
        self.log_text.pack(fill=tk.BOTH, expand=True)

        if self.reference_files:
            for item in self.reference_files:
                self.ref_list.insert(tk.END, item)

    def _add_labeled_entry(self, parent, label, variable, row):
        ttk.Label(parent, text=label).grid(row=row, column=0, sticky="w", pady=4, padx=(0, 8))
        ttk.Entry(parent, textvariable=variable).grid(row=row, column=1, sticky="ew", pady=4)

    def _add_path_row(self, parent, label, variable, row, pick_file=False, pick_dir=False):
        ttk.Label(parent, text=label).grid(row=row, column=0, sticky="w", pady=4, padx=(0, 8))
        ttk.Entry(parent, textvariable=variable).grid(row=row, column=1, sticky="ew", pady=4)

        def choose():
            if pick_file:
                path = filedialog.askopenfilename()
            elif pick_dir:
                path = filedialog.askdirectory()
            else:
                path = ""
            if path:
                variable.set(path)
                if label == "Project Path":
                    self._sync_workspace_from_project(path)

        ttk.Button(parent, text="Browse", command=choose).grid(row=row, column=2, sticky="ew", padx=(8, 0))
        parent.columnconfigure(1, weight=1)

    def toggle_advanced(self):
        if self.show_advanced.get():
            self.advanced_frame.grid()
        else:
            self.advanced_frame.grid_remove()

    def _sync_workspace_from_project(self, project_path: str):
        project = Path(project_path)
        if project.exists():
            self.workspace_dir.set(str(project.parent))
            if not self.reference_files:
                self.add_project_as_reference()

    def _ensure_output_dir(self):
        Path(self.output_dir.get()).mkdir(parents=True, exist_ok=True)

    def _load_state(self):
        try:
            if not SETTINGS_FILE.exists():
                return
            data = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
            self.task_name.set(data.get("task_name", self.task_name.get()))
            self.board.set(data.get("board", self.board.get()))
            self.mcu.set(data.get("mcu", self.mcu.get()))
            self.uv4_path.set(data.get("uv4_path", self.uv4_path.get()))
            self.project_path.set(data.get("project_path", self.project_path.get()))
            self.target_name.set(data.get("target_name", self.target_name.get()))
            self.serial_port.set(data.get("serial_port", self.serial_port.get()))
            self.baud_rate.set(data.get("baud_rate", self.baud_rate.get()))
            self.expect_keyword.set(data.get("expect_keyword", self.expect_keyword.get()))
            self.keil_monitor.set(data.get("keil_monitor", self.keil_monitor.get()))
            self.flash_algorithm.set(data.get("flash_algorithm", self.flash_algorithm.get()))
            self.output_dir.set(data.get("output_dir", self.output_dir.get()))
            loaded_output_dir = self.output_dir.get()
            if "AI try" in loaded_output_dir and "stm32" in loaded_output_dir and "工程" not in loaded_output_dir:
                self.output_dir.set(str(DEFAULT_STM32_PROJECTS_DIR))
            self.workspace_dir.set(data.get("workspace_dir", self.workspace_dir.get()))
            self.model.set(data.get("model", self.model.get()))
            self.tsx_path.set(data.get("tsx_path", self.tsx_path.get()))
            self.codex_path.set(data.get("codex_path", self.codex_path.get()))
            self.cubemx_path.set(data.get("cubemx_path", self.cubemx_path.get()))
            self.python_path.set(data.get("python_path", self.python_path.get()))
            self.reference_files = data.get("reference_files", [])
            self._loaded_description = data.get("description")
            self._loaded_modules = data.get("modules_text")
            self.show_advanced.set(bool(data.get("show_advanced", False)))
        except Exception:
            self.reference_files = []
            self._loaded_description = None
            self._loaded_modules = None

    def _save_state(self):
        try:
            self._ensure_output_dir()
            data = {
                "task_name": self.task_name.get().strip(),
                "board": self.board.get().strip(),
                "mcu": self.mcu.get().strip(),
                "uv4_path": self.uv4_path.get().strip(),
                "project_path": self.project_path.get().strip(),
                "target_name": self.target_name.get().strip(),
                "serial_port": self.serial_port.get().strip(),
                "baud_rate": self.baud_rate.get().strip(),
                "expect_keyword": self.expect_keyword.get().strip(),
                "keil_monitor": self.keil_monitor.get().strip(),
                "flash_algorithm": self.flash_algorithm.get().strip(),
                "output_dir": self.output_dir.get().strip(),
                "workspace_dir": self.workspace_dir.get().strip(),
                "model": self.model.get().strip(),
                "tsx_path": self.tsx_path.get().strip(),
                "codex_path": self.codex_path.get().strip(),
                "cubemx_path": self.cubemx_path.get().strip(),
                "python_path": self.python_path.get().strip(),
                "reference_files": list(self.reference_files),
                "description": self.description_text.get("1.0", tk.END).strip(),
                "modules_text": self.modules_text.get("1.0", tk.END).strip(),
                "show_advanced": self.show_advanced.get()
            }
            SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
            SETTINGS_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        except Exception as exc:
            self.append_log(f"State save warning: {exc}")

    def add_reference_file(self):
        paths = filedialog.askopenfilenames()
        for path in paths:
            if path not in self.reference_files:
                self.reference_files.append(path)
                self.ref_list.insert(tk.END, path)
        self._save_state()

    def remove_reference_file(self):
        selection = list(self.ref_list.curselection())
        selection.reverse()
        for index in selection:
            self.ref_list.delete(index)
            del self.reference_files[index]
        self._save_state()

    def add_project_as_reference(self):
        path = self.project_path.get().strip()
        if path and path not in self.reference_files:
            self.reference_files.append(path)
            self.ref_list.insert(tk.END, path)
            self._save_state()

    def append_log(self, message: str):
        self.log_text.insert(tk.END, f"{message}\n")
        self.log_text.see(tk.END)

    def reset_progress(self, steps):
        self.progress_steps = list(steps)
        self.progress_done = set()
        self.progress_list.delete(0, tk.END)
        for step in self.progress_steps:
            self.progress_list.insert(tk.END, "[ ] " + step)
        self.progress_bar["value"] = 0
        self.progress_text.set("0/" + str(len(self.progress_steps)))
        self.step_text.set("Step: waiting")
        self.update_idletasks()

    def set_progress_step(self, index, status="running", detail=None):
        if not self.progress_steps or index < 0 or index >= len(self.progress_steps):
            return

        step = self.progress_steps[index]
        prefix_by_status = {
            "running": "[>]",
            "done": "[x]",
            "failed": "[!]"
        }
        prefix = prefix_by_status.get(status, "[ ]")
        self.progress_list.delete(index)
        self.progress_list.insert(index, prefix + " " + step)
        self.progress_list.selection_clear(0, tk.END)
        self.progress_list.selection_set(index)
        self.progress_list.see(index)

        if status == "done":
            self.progress_done.add(index)
            self.step_text.set("Done: " + step)
        elif status == "failed":
            self.step_text.set("Failed: " + step)
        else:
            self.step_text.set("Running: " + step)

        total = len(self.progress_steps)
        done = len(self.progress_done)
        if status == "running":
            value = max(done, index) * 100 / total
        else:
            value = done * 100 / total
        self.progress_bar["value"] = value
        self.progress_text.set(str(done) + "/" + str(total))
        if detail:
            self.append_log(detail)
        self.update_idletasks()

    def build_modules(self):
        modules = []
        for raw_line in self.modules_text.get("1.0", tk.END).splitlines():
            line = raw_line.strip()
            if not line:
                continue
            parts = [part.strip() for part in line.split(",") if part.strip()]
            name = parts[0]
            module = {"name": name}
            for item in parts[1:]:
                if "=" not in item:
                    continue
                key, value = item.split("=", 1)
                value = value.strip()
                if value.isdigit():
                    module[key.strip()] = int(value)
                else:
                    module[key.strip()] = value
            modules.append(module)

        if not modules:
            modules.append({
                "name": "custom_requirement",
                "summary": self.description_text.get("1.0", tk.END).strip()
            })

        return modules

    def build_task_data(self):
        description = self.description_text.get("1.0", tk.END).strip()
        runtime_keywords = [self.expect_keyword.get().strip()] if self.expect_keyword.get().strip() else []

        task = {
            "task_name": self.task_name.get().strip() or "stm32_task",
            "description": description,
            "board": self.board.get().strip() or None,
            "mcu": self.mcu.get().strip() or "unknown",
            "toolchain": {
                "type": "keil_uv4",
                "uv4_path": self.uv4_path.get().strip(),
                "project_path": self.project_path.get().strip(),
                "target_name": self.target_name.get().strip()
            },
            "required_modules": self.build_modules(),
            "reference_files": list(self.reference_files),
            "runtime_verify": {
                "serial_port": self.serial_port.get().strip(),
                "baud_rate": int(self.baud_rate.get().strip() or "115200"),
                "timeout_s": 10,
                "expect_keywords": runtime_keywords
            },
            "programmer": {
                "type": "keil_uv4",
                "monitor": self.keil_monitor.get().strip(),
                "flash_algorithm": self.flash_algorithm.get().strip()
            }
        }
        return task

    def task_json_path(self) -> Path:
        return Path(self.output_dir.get().strip()) / "task.json"

    def pipeline_output_dir(self) -> Path:
        return Path(self.output_dir.get().strip()) / "pipeline-output"

    def prompt_output_path(self) -> Path:
        return self.pipeline_output_dir() / "task_parser_prompt.txt"

    def ai_result_path(self) -> Path:
        return Path(self.output_dir.get().strip()) / "ai_plan_result.json"

    def codegen_plan_path(self) -> Path:
        return Path(self.output_dir.get().strip()) / "codegen_plan.json"

    def design_json_path(self) -> Path:
        return Path(self.output_dir.get().strip()) / "design_json.json"

    def generated_project_root(self) -> Path:
        return Path(self.output_dir.get().strip()) / "generated-project"

    def generated_project_dir(self) -> Path:
        return self.generated_project_root() / (self.task_name.get().strip() or "stm32_task")

    def generated_run_root(self) -> Path:
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        return Path(self.output_dir.get().strip()) / "generated-project-runs" / timestamp

    def flash_config_path(self) -> Path:
        return self.pipeline_output_dir() / "generated.flash_verify.json"

    def save_task_json(self):
        try:
            self._ensure_output_dir()
            self._save_state()
            task_path = self.task_json_path()
            task_path.write_text(
                json.dumps(self.build_task_data(), indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8"
            )
            self.append_log(f"Saved task JSON: {task_path}")
            return task_path
        except Exception as exc:
            messagebox.showerror("Save Task JSON", str(exc))
            raise

    def run_subprocess(self, command, cwd=None, stdin_text=None, timeout_s=None):
        self.append_log("Running: " + " ".join(f'"{item}"' if " " in item else item for item in command))
        stdin_bytes = stdin_text.encode("utf-8") if stdin_text is not None else None
        process = subprocess.Popen(
            command,
            stdin=subprocess.PIPE if stdin_bytes is not None else None,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=cwd,
        )
        try:
            stdout_bytes, stderr_bytes = process.communicate(stdin_bytes, timeout=timeout_s)
        except subprocess.TimeoutExpired:
            try:
                process.kill()
            except Exception:
                pass
            stdout_bytes, stderr_bytes = process.communicate()
            stdout = stdout_bytes.decode("utf-8", errors="ignore") if stdout_bytes else ""
            stderr = stderr_bytes.decode("utf-8", errors="ignore") if stderr_bytes else ""
            self.append_log(f"Timeout after {timeout_s}s")
            if stdout.strip():
                self.append_log("STDOUT:\n" + stdout.strip())
            if stderr.strip():
                self.append_log("STDERR:\n" + stderr.strip())
            self.append_log("Return code: 124")
            return subprocess.CompletedProcess(command, 124, stdout, stderr)
        stdout = stdout_bytes.decode("utf-8", errors="ignore") if stdout_bytes else ""
        stderr = stderr_bytes.decode("utf-8", errors="ignore") if stderr_bytes else ""
        result = subprocess.CompletedProcess(command, process.returncode, stdout, stderr)
        if result.stdout.strip():
            self.append_log("STDOUT:\n" + result.stdout.strip())
        if result.stderr.strip():
            self.append_log("STDERR:\n" + result.stderr.strip())
        self.append_log(f"Return code: {result.returncode}")
        return result

    def run_subprocess_until_file(self, command, output_path, cwd=None, stdin_text=None, timeout_s=240, stable_s=4):
        self.append_log("Running: " + " ".join(f'"{item}"' if " " in item else item for item in command))
        stdin_bytes = stdin_text.encode("utf-8") if stdin_text is not None else None
        process = subprocess.Popen(
            command,
            stdin=subprocess.PIPE if stdin_bytes is not None else None,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=cwd,
        )
        if stdin_bytes is not None:
            try:
                process.stdin.write(stdin_bytes)
                process.stdin.close()
                process.stdin = None
            except Exception as exc:
                self.append_log(f"STDIN warning: {exc}")

        output_path = Path(output_path)
        started = time.time()
        stable_started = None
        last_size = -1

        while True:
            if process.poll() is not None:
                stdout_bytes, stderr_bytes = process.communicate()
                stdout = stdout_bytes.decode("utf-8", errors="ignore") if stdout_bytes else ""
                stderr = stderr_bytes.decode("utf-8", errors="ignore") if stderr_bytes else ""
                result = subprocess.CompletedProcess(command, process.returncode, stdout, stderr)
                if result.stdout.strip():
                    self.append_log("STDOUT:\n" + result.stdout.strip())
                if result.stderr.strip():
                    self.append_log("STDERR:\n" + result.stderr.strip())
                self.append_log(f"Return code: {result.returncode}")
                return result

            if output_path.exists():
                size = output_path.stat().st_size
                if size > 0 and size == last_size:
                    if stable_started is None:
                        stable_started = time.time()
                    elif time.time() - stable_started >= stable_s:
                        self.append_log(f"Output file is ready: {output_path}")
                        try:
                            process.terminate()
                        except Exception:
                            pass
                        try:
                            stdout_bytes, stderr_bytes = process.communicate(timeout=5)
                        except Exception:
                            try:
                                process.kill()
                            except Exception:
                                pass
                            stdout_bytes, stderr_bytes = b"", b""
                        stdout = stdout_bytes.decode("utf-8", errors="ignore") if stdout_bytes else ""
                        stderr = stderr_bytes.decode("utf-8", errors="ignore") if stderr_bytes else ""
                        if stdout.strip():
                            self.append_log("STDOUT:\n" + stdout.strip())
                        if stderr.strip():
                            self.append_log("STDERR:\n" + stderr.strip())
                        self.append_log("Return code: 0 (accepted completed output file)")
                        return subprocess.CompletedProcess(command, 0, stdout, stderr)
                else:
                    last_size = size
                    stable_started = None

            if time.time() - started > timeout_s:
                try:
                    process.kill()
                except Exception:
                    pass
                raise TimeoutError(f"Command timed out after {timeout_s}s: {' '.join(command)}")

            time.sleep(0.5)

    def find_generated_uvprojx(self, root=None) -> Path:
        root = Path(root) if root else self.generated_project_root()
        candidates = sorted(root.rglob("*.uvprojx"), key=lambda item: item.stat().st_mtime, reverse=True)
        if not candidates:
            raise FileNotFoundError(f"No uvprojx found under {root}")
        return candidates[0]

    def read_target_name(self, uvprojx: Path) -> str:
        text = uvprojx.read_text(encoding="utf-8", errors="ignore")
        start = text.find("<TargetName>")
        end = text.find("</TargetName>")
        if start >= 0 and end > start:
            return text[start + len("<TargetName>"):end].strip()
        return uvprojx.stem

    def write_generated_flash_config(self, uvprojx: Path) -> Path:
        task = self.build_task_data()
        target_name = self.read_target_name(uvprojx)
        config = {
            "project_name": task["task_name"],
            "board": task.get("board"),
            "mcu": task.get("mcu"),
            "build": {
                "tool": "keil_uv4",
                "uv4_path": task["toolchain"]["uv4_path"],
                "project_path": str(uvprojx),
                "target_name": target_name
            },
            "flash": {
                "tool": "keil_uv4",
                "use_keil_download": True,
                "project_path": str(uvprojx),
                "target_name": target_name
            },
            "verify_runtime": {
                "method": "uart",
                "port": task["runtime_verify"]["serial_port"],
                "baudrate": task["runtime_verify"]["baud_rate"],
                "expect_text": self.expect_keyword.get().strip()
            }
        }
        path = self.flash_config_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(config, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        self.append_log(f"Updated flash config for generated project: {path}")
        return path

    def run_pipeline(self):
        def job():
            step_index = 0
            try:
                steps = ["Save Task JSON", "Run Task Pipeline"]
                self.reset_progress(steps)
                self.status_text.set("Running pipeline")
                self.set_progress_step(step_index, "running")
                task_path = self.save_task_json()
                self.set_progress_step(step_index, "done")
                step_index = 1
                out_dir = self.pipeline_output_dir()
                out_dir.mkdir(parents=True, exist_ok=True)
                cmd = [
                    self.tsx_path.get().strip(),
                    str(PROJECT_ROOT / "src" / "cli.ts"),
                    "task-pipeline",
                    "--task",
                    str(task_path),
                    "--out",
                    str(out_dir)
                ]
                self.set_progress_step(step_index, "running")
                result = self.run_subprocess(cmd, cwd=str(PROJECT_ROOT))
                if result.returncode != 0:
                    raise RuntimeError("task-pipeline failed")
                self.set_progress_step(step_index, "done")
                self.append_log("Pipeline complete.")
                self.status_text.set("Pipeline success")
            except Exception as exc:
                self.set_progress_step(step_index, "failed")
                self.append_log(f"Pipeline error: {exc}")
                self.status_text.set("Pipeline failed")

        threading.Thread(target=job, daemon=True).start()

    def send_to_chatgpt(self):
        def job():
            step_index = 0
            try:
                steps = ["Prepare Prompt", "Send To ChatGPT"]
                self.reset_progress(steps)
                self.status_text.set("Sending to ChatGPT")
                prompt_path = self.prompt_output_path()
                if not prompt_path.exists():
                    self.set_progress_step(step_index, "running", "Prompt missing, running pipeline first.")
                    self.append_log(f"Prompt file not found, running pipeline first: {prompt_path}")
                    task_path = self.save_task_json()
                    out_dir = self.pipeline_output_dir()
                    out_dir.mkdir(parents=True, exist_ok=True)
                    pipeline_cmd = [
                        self.tsx_path.get().strip(),
                        str(PROJECT_ROOT / "src" / "cli.ts"),
                        "task-pipeline",
                        "--task",
                        str(task_path),
                        "--out",
                        str(out_dir)
                    ]
                    pipeline_result = self.run_subprocess(pipeline_cmd, cwd=str(PROJECT_ROOT))
                    if pipeline_result.returncode != 0:
                        raise RuntimeError("task-pipeline failed")
                    if not prompt_path.exists():
                        raise FileNotFoundError(f"Prompt file not found after pipeline: {prompt_path}")
                self.set_progress_step(step_index, "done")
                step_index = 1

                prompt = prompt_path.read_text(encoding="utf-8")
                output_path = self.ai_result_path()
                workspace = self.workspace_dir.get().strip() or self.output_dir.get().strip()

                cmd = [
                    self.codex_path.get().strip(),
                    "exec",
                    "-C",
                    workspace,
                    "--skip-git-repo-check",
                    "-s",
                    "read-only",
                    "-m",
                    self.model.get().strip(),
                    "--color",
                    "never",
                    "-o",
                    str(output_path),
                    "-"
                ]
                self.set_progress_step(step_index, "running")
                result = self.run_subprocess_until_file(cmd, output_path, cwd=workspace, stdin_text=prompt)
                if result.returncode != 0:
                    raise RuntimeError("codex exec failed")
                self.set_progress_step(step_index, "done")
                self.append_log(f"AI result saved: {output_path}")
                self.status_text.set("ChatGPT success")
                self._save_state()
            except Exception as exc:
                self.set_progress_step(step_index, "failed")
                self.append_log(f"Send error: {exc}")
                self.status_text.set("ChatGPT failed")

        threading.Thread(target=job, daemon=True).start()

    def run_all(self):
        def job():
            step_index = 0
            try:
                steps = [
                    "Save Task JSON",
                    "Run Task Pipeline",
                    "Send To ChatGPT",
                    "Parse AI Code Plan",
                    "Generate Design JSON",
                    "Generate CubeMX Project",
                    "Apply Main Program",
                    "Find Keil Project",
                    "Configure Keil Download",
                    "Write Flash Config",
                    "Build / Flash / Verify"
                ]
                self.reset_progress(steps)
                self.status_text.set("Running all")
                self.set_progress_step(step_index, "running")
                task_path = self.save_task_json()
                self.set_progress_step(step_index, "done")
                step_index = 1
                out_dir = self.pipeline_output_dir()
                out_dir.mkdir(parents=True, exist_ok=True)

                pipeline_cmd = [
                    self.tsx_path.get().strip(),
                    str(PROJECT_ROOT / "src" / "cli.ts"),
                    "task-pipeline",
                    "--task",
                    str(task_path),
                    "--out",
                    str(out_dir)
                ]
                self.set_progress_step(step_index, "running")
                pipeline_result = self.run_subprocess(pipeline_cmd, cwd=str(PROJECT_ROOT))
                if pipeline_result.returncode != 0:
                    raise RuntimeError("task-pipeline failed")
                self.set_progress_step(step_index, "done")
                step_index = 2

                prompt = self.prompt_output_path().read_text(encoding="utf-8")
                output_path = self.ai_result_path()
                workspace = self.workspace_dir.get().strip() or self.output_dir.get().strip()
                codex_cmd = [
                    self.codex_path.get().strip(),
                    "exec",
                    "-C",
                    workspace,
                    "--skip-git-repo-check",
                    "-s",
                    "read-only",
                    "-m",
                    self.model.get().strip(),
                    "--color",
                    "never",
                    "-o",
                    str(output_path),
                    "-"
                ]
                self.set_progress_step(step_index, "running")
                codex_result = self.run_subprocess_until_file(codex_cmd, output_path, cwd=workspace, stdin_text=prompt)
                if codex_result.returncode != 0:
                    raise RuntimeError("codex exec failed")
                self.set_progress_step(step_index, "done")
                step_index = 3

                codegen_path = self.codegen_plan_path()
                codegen_cmd = [
                    self.tsx_path.get().strip(),
                    str(PROJECT_ROOT / "src" / "cli.ts"),
                    "ai-plan-parse",
                    "--task",
                    str(task_path),
                    "--ai",
                    str(output_path),
                    "--out",
                    str(codegen_path)
                ]
                self.set_progress_step(step_index, "running")
                codegen_result = self.run_subprocess(codegen_cmd, cwd=str(PROJECT_ROOT))
                if codegen_result.returncode != 0:
                    raise RuntimeError("ai-plan-parse failed")
                self.set_progress_step(step_index, "done")
                step_index = 4

                design_path = self.design_json_path()
                design_cmd = [
                    self.tsx_path.get().strip(),
                    str(PROJECT_ROOT / "src" / "cli.ts"),
                    "ai-to-design-json",
                    "--task",
                    str(task_path),
                    "--ai",
                    str(output_path),
                    "--out",
                    str(design_path)
                ]
                self.set_progress_step(step_index, "running")
                design_result = self.run_subprocess(design_cmd, cwd=str(PROJECT_ROOT))
                if design_result.returncode != 0:
                    raise RuntimeError("ai-to-design-json failed")
                self.set_progress_step(step_index, "done")
                step_index = 5

                project_root = self.generated_run_root()
                project_root.mkdir(parents=True, exist_ok=True)
                self.append_log(f"Using clean generated project root: {project_root}")
                cubemx_cmd = [
                    self.tsx_path.get().strip(),
                    str(PROJECT_ROOT / "src" / "cli.ts"),
                    "cubemx-generate",
                    "--design",
                    str(design_path),
                    "--out",
                    str(project_root),
                    "--timeout",
                    "180"
                ]
                cubemx_path = self.cubemx_path.get().strip()
                if cubemx_path:
                    cubemx_cmd.extend(["--cubemx", cubemx_path])
                python_path = self.python_path.get().strip()
                if python_path:
                    cubemx_cmd.extend(["--python", python_path])
                self.set_progress_step(step_index, "running")
                cubemx_result = self.run_subprocess(cubemx_cmd, cwd=str(PROJECT_ROOT), timeout_s=240)
                if cubemx_result.returncode != 0:
                    raise RuntimeError("cubemx-generate failed")
                self.set_progress_step(step_index, "done")
                step_index = 6

                project_dir = project_root / (self.task_name.get().strip() or "stm32_task")
                apply_cmd = [
                    self.tsx_path.get().strip(),
                    str(PROJECT_ROOT / "src" / "cli.ts"),
                    "apply-codegen-plan",
                    "--codegen",
                    str(codegen_path),
                    "--project",
                    str(project_dir)
                ]
                self.set_progress_step(step_index, "running")
                apply_result = self.run_subprocess(apply_cmd, cwd=str(PROJECT_ROOT))
                if apply_result.returncode != 0:
                    raise RuntimeError("apply-codegen-plan failed")
                self.set_progress_step(step_index, "done")
                step_index = 7

                self.set_progress_step(step_index, "running")
                uvprojx = self.find_generated_uvprojx(project_root)
                self.set_progress_step(step_index, "done")
                step_index = 8
                keil_cmd = [
                    self.tsx_path.get().strip(),
                    str(PROJECT_ROOT / "src" / "cli.ts"),
                    "keil-configure-download",
                    "--project",
                    str(uvprojx),
                    "--monitor",
                    self.keil_monitor.get().strip(),
                    "--algorithm",
                    self.flash_algorithm.get().strip()
                ]
                self.set_progress_step(step_index, "running")
                keil_result = self.run_subprocess(keil_cmd, cwd=str(PROJECT_ROOT))
                if keil_result.returncode != 0:
                    raise RuntimeError("keil-configure-download failed")
                self.set_progress_step(step_index, "done")
                step_index = 9

                self.set_progress_step(step_index, "running")
                flash_config = self.write_generated_flash_config(uvprojx)
                self.set_progress_step(step_index, "done")
                step_index = 10
                flash_cmd = [
                    self.tsx_path.get().strip(),
                    str(PROJECT_ROOT / "src" / "cli.ts"),
                    "flash-verify",
                    "--config",
                    str(flash_config),
                    "--run",
                    "true"
                ]
                if python_path:
                    flash_cmd.extend(["--python", python_path])
                self.set_progress_step(step_index, "running")
                flash_result = self.run_subprocess(flash_cmd, cwd=str(PROJECT_ROOT))
                if flash_result.returncode != 0:
                    raise RuntimeError("flash-verify failed")
                self.set_progress_step(step_index, "done")

                self.append_log(f"Run-all complete. Generated project: {project_dir}")
                self.status_text.set("Run-all success")
                self._save_state()
            except Exception as exc:
                self.set_progress_step(step_index, "failed")
                self.append_log(f"Run-all error: {exc}")
                self.status_text.set("Run-all failed")

        threading.Thread(target=job, daemon=True).start()


if __name__ == "__main__":
    app = App()
    if hasattr(app, "_loaded_description") and app._loaded_description:
        app.description_text.delete("1.0", tk.END)
        app.description_text.insert("1.0", app._loaded_description)
    if hasattr(app, "_loaded_modules") and app._loaded_modules:
        app.modules_text.delete("1.0", tk.END)
        app.modules_text.insert("1.0", app._loaded_modules)
    app.mainloop()
