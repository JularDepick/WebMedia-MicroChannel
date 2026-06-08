#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
脚本1：生成指定目录下的文件列表（按名称升序）
用法：python generate_file_list.py --dir <目录路径> [--output <输出文件>] [--relative] [--no-recursive]
配置区域：可修改下方变量作为默认行为，命令行参数会覆盖这些默认值。
"""

import os
import argparse
from pathlib import Path

# ==================== 配置区域 ====================
# 默认扫描的目录（如果命令行未提供 --dir 则使用，但 --dir 是必需的，这里仅作示例）
DEFAULT_DIR = "C:\\Users\\liwenfang\\Desktop\\accepted\\"   # 默认扫描当前目录（当命令行未提供时，仍需检查参数逻辑，实际下面会要求 --dir）
DEFAULT_OUTPUT = "C:\\Users\\liwenfang\\Desktop\\accepted\\.list.txt"   # 默认输出文件路径，None 表示自动生成 "<目录名>.list.txt"
DEFAULT_RELATIVE = True  # 默认输出相对路径（相对于扫描目录）
DEFAULT_RECURSIVE = False  # 默认递归子目录
# ================================================

def generate_file_list(directory, output_file, relative=True, recursive=True):
    directory = Path(directory).resolve()
    if not directory.is_dir():
        raise NotADirectoryError(f"路径不存在或不是目录: {directory}")

    file_paths = []
    if recursive:
        for root, dirs, files in os.walk(directory):
            for file in sorted(files):
                full_path = Path(root) / file
                if relative:
                    rel_path = full_path.relative_to(directory)
                    file_paths.append(str(rel_path))
                else:
                    file_paths.append(file)
    else:
        for item in sorted(directory.iterdir()):
            if item.is_file():
                if relative:
                    file_paths.append(item.name)
                else:
                    file_paths.append(item.name)

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(file_paths))

    print(f"已生成文件列表，共 {len(file_paths)} 个文件 -> {output_file}")

def main():
    parser = argparse.ArgumentParser(description="生成目录下的文件列表（按名称升序）")
    parser.add_argument('--dir', '-d', help='要扫描的目录路径（必需）')
    parser.add_argument('--output', '-o', help='输出列表文件路径（默认：<目录名>.list.txt）')
    parser.add_argument('--relative', action='store_true', default=None,
                        help='输出相对路径（相对于扫描目录）')
    parser.add_argument('--no-relative', dest='relative', action='store_false',
                        help='关闭相对路径，仅输出文件名')
    parser.add_argument('--recursive', action='store_true', default=None,
                        help='递归子目录')
    parser.add_argument('--no-recursive', dest='recursive', action='store_false',
                        help='不递归，仅扫描当前目录')

    args = parser.parse_args()

    # 应用配置区域默认值（如果命令行未指定）
    # 注意：relative 和 recursive 的三态处理
    if args.relative is None:
        relative = DEFAULT_RELATIVE
    else:
        relative = args.relative

    if args.recursive is None:
        recursive = DEFAULT_RECURSIVE
    else:
        recursive = args.recursive

    # 目录参数：如果命令行未提供，则使用配置区域的 DEFAULT_DIR
    if not args.dir:
        directory = DEFAULT_DIR
    else:
        directory = args.dir

    # 输出文件
    if args.output:
        output_path = args.output
    elif DEFAULT_OUTPUT:
        output_path = DEFAULT_OUTPUT
    else:
        dir_name = Path(directory).resolve().name
        output_path = f"{dir_name}.list.txt"

    try:
        generate_file_list(directory, output_path, relative, recursive)
    except Exception as e:
        print(f"错误: {e}")
        return 1
    return 0

if __name__ == '__main__':
    exit(main())
