#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
脚本2：根据列表文件，将源目录下存在的文件复制/移动到目标目录
用法：python sync_files_from_list.py --list <列表文件> --source <源目录B> --dest <目标目录C>
      [--action copy|move] [--conflict skip|overwrite]
配置区域：可修改下方变量作为默认行为，命令行参数会覆盖这些默认值。
"""

import os
import shutil
import argparse
from pathlib import Path

# ==================== 配置区域 ====================
DEFAULT_LIST_FILE = "C:\\Users\\liwenfang\\Desktop\\image\\.list.txt"       # 默认列表文件路径（若命令行未提供 --list，则必须配置此项或通过命令行提供）
DEFAULT_SOURCE_DIR = "C:\\Users\\liwenfang\\Desktop\\image\\"      # 默认源目录B（若命令行未提供 --source，则使用此配置）
DEFAULT_DEST_DIR = "C:\\Users\\liwenfang\\Desktop\\accepted\\"        # 默认目标目录C
DEFAULT_ACTION = "copy"        # 默认操作：'copy' 或 'move'
DEFAULT_CONFLICT = "skip"      # 默认冲突处理：'skip' 或 'overwrite'
# ================================================

def sync_files(list_file, source_dir, dest_dir, action='copy', conflict='skip'):
    source_dir = Path(source_dir).resolve()
    dest_dir = Path(dest_dir).resolve()
    list_path = Path(list_file)

    if not source_dir.is_dir():
        raise NotADirectoryError(f"源目录不存在: {source_dir}")
    if not list_path.is_file():
        raise FileNotFoundError(f"列表文件不存在: {list_path}")

    with open(list_path, 'r', encoding='utf-8') as f:
        items = [line.strip() for line in f if line.strip()]

    if not items:
        print("列表文件为空，无需处理")
        return

    success = 0
    skipped = 0
    missing = 0
    errors = 0

    for rel_path in items:
        src_file = source_dir / rel_path
        if not src_file.is_file():
            print(f"  跳过（源文件不存在）: {rel_path}")
            missing += 1
            continue

        dest_file = dest_dir / rel_path
        dest_parent = dest_file.parent

        if dest_file.exists():
            if conflict == 'skip':
                print(f"  跳过（目标已存在）: {rel_path}")
                skipped += 1
                continue
            elif conflict == 'overwrite':
                pass
            else:
                raise ValueError(f"未知的冲突处理策略: {conflict}")

        try:
            dest_parent.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            print(f"  错误：无法创建目录 {dest_parent}: {e}")
            errors += 1
            continue

        try:
            if action == 'copy':
                shutil.copy2(src_file, dest_file)
                print(f"  复制: {rel_path}")
            elif action == 'move':
                shutil.move(str(src_file), str(dest_file))
                print(f"  移动: {rel_path}")
            else:
                raise ValueError(f"未知操作: {action}，请使用 copy 或 move")
            success += 1
        except Exception as e:
            print(f"  错误处理 {rel_path}: {e}")
            errors += 1

    print("\n=== 操作完成 ===")
    print(f"成功: {success}")
    print(f"跳过（目标已存在）: {skipped}")
    print(f"缺失（源文件不存在）: {missing}")
    print(f"错误: {errors}")
    print(f"总计处理: {len(items)} 项")

def main():
    parser = argparse.ArgumentParser(description="根据列表文件，从源目录同步文件到目标目录（复制或移动）")
    parser.add_argument('--list', '-l', help='列表文件路径（由脚本1生成）')
    parser.add_argument('--source', '-s', help='源目录B')
    parser.add_argument('--dest', '-d', help='目标目录C')
    parser.add_argument('--action', '-a', choices=['copy', 'move'], default=None,
                        help='操作类型：copy（复制）或 move（移动）')
    parser.add_argument('--conflict', '-c', choices=['skip', 'overwrite'], default=None,
                        help='冲突处理：skip（跳过已存在文件）或 overwrite（覆盖）')

    args = parser.parse_args()

    # 应用配置区域默认值（如果命令行未指定）
    list_file = args.list if args.list else DEFAULT_LIST_FILE
    source_dir = args.source if args.source else DEFAULT_SOURCE_DIR
    dest_dir = args.dest if args.dest else DEFAULT_DEST_DIR
    action = args.action if args.action else DEFAULT_ACTION
    conflict = args.conflict if args.conflict else DEFAULT_CONFLICT

    # 检查必需参数
    missing = []
    if not list_file:
        missing.append("--list 或配置 DEFAULT_LIST_FILE")
    if not source_dir:
        missing.append("--source 或配置 DEFAULT_SOURCE_DIR")
    if not dest_dir:
        missing.append("--dest 或配置 DEFAULT_DEST_DIR")
    if missing:
        parser.error(f"缺少必需参数: {', '.join(missing)}")

    try:
        sync_files(list_file, source_dir, dest_dir, action, conflict)
    except Exception as e:
        print(f"错误: {e}")
        return 1
    return 0

if __name__ == '__main__':
    exit(main())
