#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
图片审核批阅工具 - 配置保存版
- 展示区域固定 3:4，图片填充居中裁剪
- Ctrl+滚轮缩放展示区域大小（窗口自适应）
- 配置信息、断点信息保存在 image-judge-config.ini
- 快捷键 Enter 通过，Backspace 驳回
- 修复：切换图片不再重置缩放尺寸
"""

import os
import sys
import shutil
import glob
import configparser
import tkinter as tk
from tkinter import filedialog, messagebox, simpledialog
from PIL import Image, ImageTk

class ImageReviewer:
    def __init__(self, root):
        self.root = root
        self.root.title("图片审核批阅工具")

        # 配置文件路径（脚本所在目录）
        script_dir = os.path.dirname(os.path.abspath(__file__))
        self.config_file = os.path.join(script_dir, "image-judge-config.ini")
        self.config = configparser.ConfigParser()

        # 数据属性
        self.source_dir = "C:\\Users\\liwenfang\\Desktop\\image\\"
        self.accepted_dir = "C:\\Users\\liwenfang\\Desktop\\image\\accepted/"
        self.denied_dir = "C:\\Users\\liwenfang\\Desktop\\image\\denied/"
        self.image_list = []
        self.current_index = 0
        self.total_count = 0

        # 模式
        self.mode_move = "copy"           # copy / move
        self.mode_action = "divergence"   # divergence / extraction
        self.extraction_target = "pass"

        # 统计
        self.processed_count = 0
        self.pass_count = 0
        self.reject_count = 0
        self.skip_count = 0

        # 断点记录：最后处理的图片路径
        self.last_processed_path = None

        # 图片显示
        self.current_image_path = None
        self.original_image = None
        self.display_photo = None

        # 创建界面
        self.create_menu()
        self.create_widgets()
        self.bind_shortcuts()

        # 加载配置和断点
        self.load_config()
        self.load_checkpoint_from_config()

        # 如果配置中有源目录且有效，则加载图片
        if self.source_dir and os.path.isdir(self.source_dir):
            self.load_images()
            self.update_display()
        else:
            # 首次运行或目录无效，让用户选择
            self.choose_source_dir()

        # 确保首次显示时展示区域有合适的初始尺寸
        self.root.after(100, self.initial_display_setup)

    # ---------- 配置读写 ----------
    def load_config(self):
        """读取配置文件（通用设置 + 断点）"""
        if not os.path.exists(self.config_file):
            return
        try:
            self.config.read(self.config_file, encoding='utf-8')
            if self.config.has_section('Paths'):
                self.source_dir = self.config.get('Paths', 'source_dir', fallback='')
                self.accepted_dir = self.config.get('Paths', 'accepted_dir', fallback='./.accepted/')
                self.denied_dir = self.config.get('Paths', 'denied_dir', fallback='./.denied/')
            if self.config.has_section('Mode'):
                self.mode_move = self.config.get('Mode', 'mode_move', fallback='copy')
                self.mode_action = self.config.get('Mode', 'mode_action', fallback='divergence')
                self.extraction_target = self.config.get('Mode', 'extraction_target', fallback='pass')
                move_var_val = "conservative" if self.mode_move == "copy" else "radical"
                self.move_var.set(move_var_val)
                action_var_val = self.mode_action
                self.action_var.set(action_var_val)
                extract_val = self.extraction_target
                self.extract_target_var.set(extract_val)
                self.update_extract_menu_state()
                self.update_title()
            if self.config.has_section('Window'):
                geom = self.config.get('Window', 'geometry', fallback='')
                if geom:
                    self.root.geometry(geom)
            if self.config.has_section('Display'):
                display_w = self.config.getint('Display', 'display_width', fallback=0)
                display_h = self.config.getint('Display', 'display_height', fallback=0)
                if display_w > 0 and display_h > 0:
                    self.pending_display_size = (display_w, display_h)
                else:
                    self.pending_display_size = None
            else:
                self.pending_display_size = None
        except Exception as e:
            print(f"读取配置失败: {e}")

    def save_config(self):
        """保存当前配置（目录、模式、窗口几何、展示区域尺寸）"""
        if not self.config.has_section('Paths'):
            self.config.add_section('Paths')
        self.config.set('Paths', 'source_dir', self.source_dir)
        self.config.set('Paths', 'accepted_dir', self.accepted_dir)
        self.config.set('Paths', 'denied_dir', self.denied_dir)

        if not self.config.has_section('Mode'):
            self.config.add_section('Mode')
        self.config.set('Mode', 'mode_move', self.mode_move)
        self.config.set('Mode', 'mode_action', self.mode_action)
        self.config.set('Mode', 'extraction_target', self.extraction_target)

        if not self.config.has_section('Window'):
            self.config.add_section('Window')
        geom = self.root.geometry()
        self.config.set('Window', 'geometry', geom)

        if not self.config.has_section('Display'):
            self.config.add_section('Display')
        try:
            w = self.display_frame.winfo_width()
            h = self.display_frame.winfo_height()
            if w > 0 and h > 0:
                self.config.set('Display', 'display_width', str(w))
                self.config.set('Display', 'display_height', str(h))
        except:
            pass

        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                self.config.write(f)
        except Exception as e:
            print(f"保存配置失败: {e}")

    def load_checkpoint_from_config(self):
        """从配置文件中读取断点信息"""
        if not self.config.has_section('Checkpoint'):
            return
        self.last_processed_path = self.config.get('Checkpoint', 'last_processed_path', fallback=None)
        self.pass_count = self.config.getint('Checkpoint', 'pass_count', fallback=0)
        self.reject_count = self.config.getint('Checkpoint', 'reject_count', fallback=0)
        self.skip_count = self.config.getint('Checkpoint', 'skip_count', fallback=0)
        self.processed_count = self.config.getint('Checkpoint', 'processed_count', fallback=0)

    def save_checkpoint_to_config(self, last_path):
        """保存断点信息到配置文件"""
        if not self.config.has_section('Checkpoint'):
            self.config.add_section('Checkpoint')
        self.config.set('Checkpoint', 'last_processed_path', last_path if last_path else '')
        self.config.set('Checkpoint', 'pass_count', str(self.pass_count))
        self.config.set('Checkpoint', 'reject_count', str(self.reject_count))
        self.config.set('Checkpoint', 'skip_count', str(self.skip_count))
        self.config.set('Checkpoint', 'processed_count', str(self.processed_count))
        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                self.config.write(f)
        except Exception as e:
            print(f"保存断点失败: {e}")

    def clear_checkpoint(self):
        """清除断点"""
        if self.config.has_section('Checkpoint'):
            self.config.remove_section('Checkpoint')
            self.save_config()
        self.last_processed_path = None
        self.pass_count = self.reject_count = self.skip_count = self.processed_count = 0

    # ---------- 界面构建 ----------
    def create_menu(self):
        menubar = tk.Menu(self.root)
        self.root.config(menu=menubar)

        file_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="文件", menu=file_menu)
        file_menu.add_command(label="选择源目录", command=self.choose_source_dir)
        file_menu.add_command(label="设置通过目录", command=self.set_accepted_dir)
        file_menu.add_command(label="设置驳回目录", command=self.set_denied_dir)
        file_menu.add_separator()
        file_menu.add_command(label="手动跳转", command=self.manual_checkpoint)
        file_menu.add_command(label="重新开始", command=self.restart)
        file_menu.add_separator()
        file_menu.add_command(label="退出", command=self.root.quit)

        mode_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="模式", menu=mode_menu)

        self.move_var = tk.StringVar(value="conservative")
        mode_menu.add_radiobutton(label="保守模式 (复制)", variable=self.move_var,
                                  value="conservative", command=self.set_move_mode)
        mode_menu.add_radiobutton(label="激进模式 (移动)", variable=self.move_var,
                                  value="radical", command=self.set_move_mode)
        mode_menu.add_separator()
        self.action_var = tk.StringVar(value="divergence")
        mode_menu.add_radiobutton(label="分流模式", variable=self.action_var,
                                  value="divergence", command=self.set_action_mode)
        mode_menu.add_radiobutton(label="抽取模式", variable=self.action_var,
                                  value="extraction", command=self.set_action_mode)

        self.extract_menu = tk.Menu(mode_menu, tearoff=0)
        mode_menu.add_cascade(label="抽取目标", menu=self.extract_menu)
        self.extract_target_var = tk.StringVar(value="pass")
        self.extract_menu.add_radiobutton(label="仅通过", variable=self.extract_target_var,
                                          value="pass", command=self.set_extract_target)
        self.extract_menu.add_radiobutton(label="仅驳回", variable=self.extract_target_var,
                                          value="reject", command=self.set_extract_target)
        self.update_extract_menu_state()

    def create_widgets(self):
        self.main_container = tk.Frame(self.root, bg='gray')
        self.main_container.pack(fill=tk.BOTH, expand=True)

        self.display_frame = tk.Frame(self.main_container, bg='black')
        self.display_frame.place(relx=0.5, rely=0.5, anchor='center')

        self.canvas = tk.Canvas(self.display_frame, bg='black', highlightthickness=0)
        self.canvas.pack(fill=tk.BOTH, expand=True)

        # 状态栏
        self.status_frame = tk.Frame(self.root)
        self.status_frame.pack(side=tk.BOTTOM, fill=tk.X)

        self.info_label = tk.Label(self.status_frame, text="未加载图片", anchor='w')
        self.info_label.pack(side=tk.LEFT, padx=5)

        self.progress_label = tk.Label(self.status_frame, text="", anchor='e')
        self.progress_label.pack(side=tk.RIGHT, padx=5)

        self.stat_label = tk.Label(self.status_frame, text="统计：0/0/0/0", anchor='w')
        self.stat_label.pack(side=tk.LEFT, padx=20)

        # 按钮栏
        self.button_frame = tk.Frame(self.root)
        self.button_frame.pack(side=tk.BOTTOM, fill=tk.X, pady=5)

        self.pass_btn = tk.Button(self.button_frame, text="通过 (Enter)", bg='green', fg='white',
                                  command=self.on_pass)
        self.pass_btn.pack(side=tk.LEFT, padx=20, expand=True, fill=tk.X)

        self.reject_btn = tk.Button(self.button_frame, text="驳回 (Backspace)", bg='red', fg='white',
                                    command=self.on_reject)
        self.reject_btn.pack(side=tk.LEFT, padx=20, expand=True, fill=tk.X)

        # 事件绑定
        self.root.bind('<Configure>', self.on_window_resize)
        self.display_frame.bind('<Configure>', self.on_display_frame_resize)
        self.root.bind('<Control-MouseWheel>', self.on_ctrl_mousewheel)

        # 恢复保存的展示区域尺寸
        if hasattr(self, 'pending_display_size') and self.pending_display_size:
            w, h = self.pending_display_size
            self.root.after(100, lambda: self.set_display_frame_size(w, h))

    def bind_shortcuts(self):
        self.root.bind('<Return>', lambda e: self.on_pass())
        self.root.bind('<BackSpace>', lambda e: self.on_reject())

    # ---------- 展示区域缩放（Ctrl+滚轮）----------
    def on_ctrl_mousewheel(self, event):
        """Ctrl+滚轮缩放展示区域（比例保持 3:4）"""
        cur_w = self.display_frame.winfo_width()
        cur_h = self.display_frame.winfo_height()
        if cur_w <= 1:
            cur_w = 300
            cur_h = 400
        delta = event.delta
        scale = 1.1 if delta > 0 else 0.9
        new_w = int(cur_w * scale)
        new_h = int(new_w * 4 / 3)
        if new_w < 120:
            new_w = 120
            new_h = 160
        self.set_display_frame_size(new_w, new_h)

    def set_display_frame_size(self, width, height):
        """直接设置展示区域尺寸并更新显示"""
        self.display_frame.config(width=width, height=height)
        self.display_frame.place_configure(width=width, height=height)
        self.root.update_idletasks()
        self.redraw_current_image()
        # 每次尺寸变化后保存配置
        self.save_config()

    # ---------- 窗口自适应（有限适应）----------
    def on_window_resize(self, event):
        """窗口大小变化时，若展示区域溢出窗口则缩小，否则保持原尺寸"""
        if event.widget != self.root:
            return
        # 避免初始化时尺寸无效
        if self.display_frame.winfo_width() <= 1 or self.display_frame.winfo_height() <= 1:
            return
        self.constrain_display_size()

    def constrain_display_size(self):
        """若展示区域超出窗口内容区，缩小至最大可用尺寸"""
        cw = self.main_container.winfo_width()
        ch = self.main_container.winfo_height()
        if cw <= 1 or ch <= 1:
            return

        # 当前展示区域尺寸
        dw = self.display_frame.winfo_width()
        dh = self.display_frame.winfo_height()

        # 窗口可容纳的最大 3:4 尺寸
        max_w = cw
        max_h = int(max_w * 4 / 3)
        if max_h > ch:
            max_h = ch
            max_w = int(max_h * 3 / 4)

        # 仅当当前尺寸超过最大尺寸时才缩小
        if dw > max_w or dh > max_h:
            self.display_frame.config(width=max_w, height=max_h)
            self.display_frame.place_configure(width=max_w, height=max_h)
            self.root.update_idletasks()
            self.redraw_current_image()

    def on_display_frame_resize(self, event):
        """展示区域自身尺寸变化时重绘图片（例如 set_display_frame_size 触发）"""
        if event.widget == self.display_frame:
            self.redraw_current_image()

    # ---------- 图片绘制 ----------
    def redraw_current_image(self):
        """根据当前展示区域尺寸裁剪并显示图片"""
        if self.current_index >= len(self.image_list):
            return
        img_path = self.image_list[self.current_index]
        if img_path != self.current_image_path:
            try:
                self.original_image = Image.open(img_path)
                self.current_image_path = img_path
            except Exception as e:
                self.canvas.delete("all")
                self.canvas.create_text(10, 10, anchor='nw', text=f"无法加载: {e}", fill='red')
                return

        frame_w = self.display_frame.winfo_width()
        frame_h = self.display_frame.winfo_height()
        if frame_w <= 1 or frame_h <= 1:
            return

        img_w, img_h = self.original_image.size
        scale = max(frame_w / img_w, frame_h / img_h)
        scaled_w = int(img_w * scale)
        scaled_h = int(img_h * scale)

        scaled_img = self.original_image.resize((scaled_w, scaled_h), Image.Resampling.LANCZOS)

        left = (scaled_w - frame_w) // 2
        top = (scaled_h - frame_h) // 2
        right = left + frame_w
        bottom = top + frame_h
        cropped = scaled_img.crop((left, top, right, bottom))

        self.display_photo = ImageTk.PhotoImage(cropped)
        self.canvas.delete("all")
        self.canvas.create_image(0, 0, anchor='nw', image=self.display_photo)
        self.canvas.config(scrollregion=(0, 0, frame_w, frame_h))

    # ---------- 模式回调 ----------
    def set_move_mode(self):
        self.mode_move = "copy" if self.move_var.get() == "conservative" else "move"
        self.update_title()
        self.save_config()

    def set_action_mode(self):
        self.mode_action = self.action_var.get()
        self.update_extract_menu_state()
        self.update_title()
        self.save_config()

    def update_extract_menu_state(self):
        state = "normal" if self.mode_action == "extraction" else "disabled"
        self.extract_menu.entryconfig(0, state=state)
        self.extract_menu.entryconfig(1, state=state)

    def set_extract_target(self):
        self.extraction_target = self.extract_target_var.get()
        self.update_title()
        self.save_config()

    def update_title(self):
        mode_text = "保守(复制)" if self.mode_move == "copy" else "激进(移动)"
        action_text = "分流" if self.mode_action == "divergence" else f"抽取({self.extraction_target})"
        self.root.title(f"图片审核批阅工具 - {mode_text} + {action_text}")

    # ---------- 目录操作 ----------
    def choose_source_dir(self):
        d = filedialog.askdirectory(title="选择包含jpg图片的目录")
        if not d:
            return
        if not os.path.isdir(d):
            messagebox.showerror("错误", "目录不存在")
            return
        self.source_dir = d
        self.save_config()
        self.load_images()
        self.update_display()

    def set_accepted_dir(self):
        d = filedialog.askdirectory(title="通过图片存放目录")
        if d:
            self.accepted_dir = d
            self.save_config()

    def set_denied_dir(self):
        d = filedialog.askdirectory(title="驳回图片存放目录")
        if d:
            self.denied_dir = d
            self.save_config()

    def load_images(self):
        """加载源目录图片，根据断点排除已处理图片"""
        if not self.source_dir:
            return
        pattern = os.path.join(self.source_dir, "*.jpg")
        files = glob.glob(pattern)
        files.extend(glob.glob(os.path.join(self.source_dir, "*.JPG")))
        all_files = sorted(list(set(files)), key=lambda x: os.path.basename(x).lower())
        if not all_files:
            self.image_list = []
            self.total_count = 0
            self.current_index = 0
            messagebox.showwarning("警告", "目录中没有jpg图片")
            return

        start_idx = 0
        if self.last_processed_path and self.last_processed_path in all_files:
            start_idx = all_files.index(self.last_processed_path) + 1
        self.image_list = all_files[start_idx:]
        self.total_count = len(self.image_list)
        self.current_index = 0
        self.update_stat_label()

    # ---------- 手动跳转 ----------
    def manual_checkpoint(self):
        if not self.source_dir:
            messagebox.showwarning("警告", "请先选择源目录")
            return
        pattern = os.path.join(self.source_dir, "*.jpg")
        all_files = glob.glob(pattern)
        all_files.extend(glob.glob(os.path.join(self.source_dir, "*.JPG")))
        all_files = sorted(list(set(all_files)), key=lambda x: os.path.basename(x).lower())
        if not all_files:
            return
        text = simpledialog.askstring("手动跳转", "输入文件名（支持部分匹配）或序号（1-based）：")
        if not text:
            return
        target = None
        if text.isdigit():
            idx = int(text) - 1
            if 0 <= idx < len(all_files):
                target = all_files[idx]
            else:
                messagebox.showerror("错误", f"序号超出范围 (1-{len(all_files)})")
                return
        else:
            matches = [f for f in all_files if text.lower() in os.path.basename(f).lower()]
            if not matches:
                messagebox.showerror("错误", "未找到匹配的文件")
                return
            target = matches[0]

        self.clear_checkpoint()
        self.last_processed_path = None
        self.pass_count = self.reject_count = self.skip_count = self.processed_count = 0
        start_idx = all_files.index(target)
        self.image_list = all_files[start_idx:]
        self.total_count = len(self.image_list)
        self.current_index = 0
        self.update_stat_label()
        self.update_display()
        messagebox.showinfo("成功", f"已跳转到: {os.path.basename(target)}")

    # ---------- 审核操作 ----------
    def on_pass(self):
        self.process_current("pass")

    def on_reject(self):
        self.process_current("reject")

    def process_current(self, decision):
        if self.current_index >= len(self.image_list):
            return
        img_path = self.image_list[self.current_index]
        filename = os.path.basename(img_path)

        should_operate = False
        target_dir = None

        if self.mode_action == "divergence":
            should_operate = True
            target_dir = self.accepted_dir if decision == "pass" else self.denied_dir
        else:
            if decision == self.extraction_target:
                should_operate = True
                target_dir = self.accepted_dir if decision == "pass" else self.denied_dir
            else:
                should_operate = False
                self.skip_count += 1
                self.processed_count += 1

        if should_operate:
            try:
                os.makedirs(target_dir, exist_ok=True)
                dest = os.path.join(target_dir, filename)
                if self.mode_move == "copy":
                    shutil.copy2(img_path, dest)
                else:
                    shutil.move(img_path, dest)
                if decision == "pass":
                    self.pass_count += 1
                else:
                    self.reject_count += 1
                self.processed_count += 1
            except Exception as e:
                messagebox.showerror("错误", f"处理失败: {e}")
                return

        # 保存断点
        self.last_processed_path = img_path
        self.save_checkpoint_to_config(self.last_processed_path)

        self.image_list.pop(self.current_index)
        self.total_count = len(self.image_list)
        self.update_stat_label()

        # 继续显示下一张
        if self.current_index < len(self.image_list):
            self.update_display()
        else:
            self.update_display()

    def update_display(self):
        if self.current_index < len(self.image_list):
            filename = os.path.basename(self.image_list[self.current_index])
            self.info_label.config(text=f"当前: {filename}")
            progress = f"进度: {self.current_index+1}/{self.total_count}  (已处理: {self.processed_count})"
            self.progress_label.config(text=progress)
            self.root.update_idletasks()
            # 注意：不再调用 update_display_frame_size，保持用户缩放尺寸
            self.redraw_current_image()
        else:
            self.canvas.delete("all")
            self.canvas.create_text(10, 10, anchor='nw', text="审核完成！", font=('Arial',20), fill='green')
            self.info_label.config(text="所有图片已审核完毕")
            self.progress_label.config(text=f"完成: {self.total_count} 张")
            self.pass_btn.config(state='disabled')
            self.reject_btn.config(state='disabled')
            messagebox.showinfo("完成", f"审核完成！\n通过: {self.pass_count}\n驳回: {self.reject_count}\n跳过: {self.skip_count}")

    def update_stat_label(self):
        self.stat_label.config(
            text=f"统计：已处理 {self.processed_count}  | 通过 {self.pass_count}  | 驳回 {self.reject_count}  | 跳过 {self.skip_count}"
        )

    # ---------- 重新开始 ----------
    def restart(self):
        if messagebox.askyesno("重新开始", "重新开始将清空所有进度，确定吗？"):
            self.clear_checkpoint()
            self.last_processed_path = None
            self.pass_count = self.reject_count = self.skip_count = self.processed_count = 0
            self.load_images()
            self.update_display()
            self.update_stat_label()
            self.pass_btn.config(state='normal')
            self.reject_btn.config(state='normal')

    # ---------- 初始化展示区域 ----------
    def initial_display_setup(self):
        """启动时若未从配置恢复尺寸，则设置为窗口可容纳的最大尺寸"""
        if hasattr(self, 'pending_display_size') and self.pending_display_size:
            # 配置中已恢复，不再计算
            return
        # 计算并设置最大可用尺寸
        self.root.update_idletasks()
        cw = self.main_container.winfo_width()
        ch = self.main_container.winfo_height()
        if cw > 1 and ch > 1:
            max_w = cw
            max_h = int(max_w * 4 / 3)
            if max_h > ch:
                max_h = ch
                max_w = int(max_h * 3 / 4)
            self.set_display_frame_size(max_w, max_h)

def main():
    root = tk.Tk()
    app = ImageReviewer(root)
    root.mainloop()

if __name__ == "__main__":
    main()