#!/usr/bin/env python3
"""
批量重命名脚本
根据文件名升序排序，按序号重命名为：前缀 + 数字编码 + 后缀
支持补齐前导零、自定义起始数字、预览（dry-run）、自动确认等。
支持扩展名白名单（可配置为包含模式或排除模式）。
"""

import os
import argparse
import sys

# ========== 全局常量设定区域 ==========
DEFAULT_TARGET_DIR = "C:\\Users\\liwenfang\\GitHub\\JularDepick\\WebMedia-MicroChannel\\src\\images"  # 默认目标目录
DEFAULT_PREFIX = "beauty-"                     # 默认前缀
DEFAULT_SUFFIX = ".jpg"                      # 默认后缀（包含点号）
DEFAULT_DIGITS = 4                           # 默认数字位数（仅当补零时生效）
DEFAULT_START_NUM = 1                        # 默认起始数字
DEFAULT_PAD_ZERO = True                      # 默认是否补齐前导零
DEFAULT_NATURAL_SORT = False                 # 默认是否使用自然排序
DEFAULT_INCLUDE_HIDDEN = False               # 默认是否包含隐藏文件
DRY_RUN_DEFAULT = False                      # 默认是否预览模式
AUTO_CONFIRM_DEFAULT = False                 # 默认是否跳过确认

# 扩展名白名单（仅处理这些后缀的文件，不区分大小写）
# 例如 ['.jpg', '.png', '.gif']，若为空列表则处理所有文件
EXTENSION_WHITELIST = ['.py']                # 默认白名单（示例为 .py，实际可按需修改）

# 白名单模式："include" = 只重命名白名单内的文件；"exclude" = 保护白名单内的文件（不重命名）
DEFAULT_WHITELIST_MODE = "iexclude"           # 可选 "include" 或 "exclude"
# ====================================

try:
    from natsort import natsorted
    NATSORT_AVAILABLE = True
except ImportError:
    NATSORT_AVAILABLE = False
    natsorted = sorted


def is_whitelisted(filename, whitelist):
    """判断文件是否在白名单内（扩展名不区分大小写）"""
    if not whitelist:   # 空白名单表示全部允许
        return True
    ext = os.path.splitext(filename)[1].lower()
    return ext in whitelist


def get_files(target_dir, exclude_dirs=True, include_hidden=False, whitelist=None, whitelist_mode="include"):
    """
    返回目标目录下符合白名单模式的文件列表
    whitelist_mode = "include": 只返回在白名单中的文件（若whitelist为空则全部）
    whitelist_mode = "exclude": 返回不在白名单中的文件（若whitelist为空则全部）
    """
    files = []
    for entry in os.listdir(target_dir):
        full_path = os.path.join(target_dir, entry)
        if exclude_dirs and os.path.isdir(full_path):
            continue
        if not include_hidden and entry.startswith('.'):
            continue
        if not os.path.isfile(full_path):
            continue

        in_whitelist = is_whitelisted(entry, whitelist)
        if whitelist_mode == "include":
            # 只重命名白名单内的文件：只有当在白名单中（或白名单为空）才加入
            if in_whitelist or not whitelist:
                files.append(full_path)
        else:  # exclude 模式
            # 保护白名单内的文件：只有不在白名单中（或白名单为空）才加入
            if not in_whitelist or not whitelist:
                files.append(full_path)
    return files


def generate_new_name(original_path, prefix, start_num, digits, pad, suffix, current_index):
    """根据规则生成新文件名（不含路径）"""
    if pad:
        num_str = str(start_num + current_index).zfill(digits)
    else:
        num_str = str(start_num + current_index)
    return f"{prefix}{num_str}{suffix}"


def main():
    parser = argparse.ArgumentParser(
        description="批量重命名文件：按文件名升序，统一编号并添加自定义前缀和后缀"
    )
    parser.add_argument("directory", nargs="?", default=None,
                        help=f"目标目录路径（可选，未指定时使用 DEFAULT_TARGET_DIR = '{DEFAULT_TARGET_DIR}'）")
    parser.add_argument("-d", "--dir", dest="dir_option", default=None,
                        help="显式指定目标目录（优先级高于位置参数）")
    parser.add_argument("prefix", nargs="?", default=DEFAULT_PREFIX,
                        help=f"自定义前缀字符串，默认 '{DEFAULT_PREFIX}'")
    parser.add_argument("suffix", nargs="?", default=DEFAULT_SUFFIX,
                        help=f"统一输出后缀名，例如 '.jpg'，默认 '{DEFAULT_SUFFIX}'")
    parser.add_argument("--digits", type=int, default=DEFAULT_DIGITS,
                        help=f"数字编码位数（仅当启用补零时生效），默认 {DEFAULT_DIGITS}")
    parser.add_argument("--start", type=int, default=DEFAULT_START_NUM,
                        help=f"起始数字，默认 {DEFAULT_START_NUM}")
    parser.add_argument("--no-pad", action="store_false", dest="pad",
                        default=DEFAULT_PAD_ZERO,
                        help="禁止补齐前导零，数字位数自然增长")
    parser.add_argument("--natural-sort", action="store_true",
                        default=DEFAULT_NATURAL_SORT,
                        help="使用自然排序（按数字顺序）而非字典序，需要安装 natsort 库")
    parser.add_argument("--dry-run", action="store_true", default=DRY_RUN_DEFAULT,
                        help="仅预览重命名效果，不实际执行")
    parser.add_argument("--yes", "-y", action="store_true", default=AUTO_CONFIRM_DEFAULT,
                        help="跳过确认提示，直接执行")
    parser.add_argument("--include-hidden", action="store_true",
                        default=DEFAULT_INCLUDE_HIDDEN,
                        help="是否处理隐藏文件（如 .gitignore）")

    # 白名单参数
    parser.add_argument("--ext", "--whitelist", action="append", dest="ext_list",
                        help="允许处理的扩展名（含点号，不区分大小写），可多次使用或逗号分隔，例如 --ext .jpg --ext .png")
    parser.add_argument("--no-whitelist", action="store_true",
                        help="忽略全局常量中的白名单设置，处理所有文件")
    parser.add_argument("--whitelist-mode", choices=["include", "exclude"], default=DEFAULT_WHITELIST_MODE,
                        help=f"白名单模式：include=只重命名白名单内的文件，exclude=保护白名单内的文件（不重命名）。默认 {DEFAULT_WHITELIST_MODE}")

    args = parser.parse_args()

    # 确定最终的目标目录
    if args.dir_option:
        target_dir = args.dir_option
    elif args.directory:
        target_dir = args.directory
    else:
        target_dir = DEFAULT_TARGET_DIR

    if not os.path.isdir(target_dir):
        print(f"错误：目录 '{target_dir}' 不存在或不可访问", file=sys.stderr)
        sys.exit(1)

    # 处理白名单
    whitelist = None
    if not args.no_whitelist:
        if args.ext_list:
            ext_set = set()
            for ext_item in args.ext_list:
                for ext in ext_item.split(','):
                    ext = ext.strip().lower()
                    if ext and not ext.startswith('.'):
                        ext = '.' + ext
                    ext_set.add(ext)
            whitelist = ext_set
        else:
            if EXTENSION_WHITELIST:
                whitelist = {ext.lower() if ext.startswith('.') else f'.{ext.lower()}' for ext in EXTENSION_WHITELIST}
            else:
                whitelist = None

    # 获取文件列表（根据白名单模式过滤）
    files = get_files(target_dir, include_hidden=args.include_hidden, whitelist=whitelist, whitelist_mode=args.whitelist_mode)
    if not files:
        if whitelist:
            mode_desc = "只重命名白名单内的文件" if args.whitelist_mode == "include" else "排除白名单内的文件（保护它们）"
            print(f"目录中没有找到符合条件（{mode_desc}，白名单 {whitelist}）的文件。")
        else:
            print("目录中没有找到任何文件（已排除子目录）。")
        return

    # 排序
    if args.natural_sort:
        if not NATSORT_AVAILABLE:
            print("警告：未安装 natsort 库，将使用普通字符串排序。可用 pip install natsort 安装。",
                  file=sys.stderr)
            files_sorted = sorted(files, key=lambda p: os.path.basename(p))
        else:
            files_sorted = natsorted(files, key=lambda p: os.path.basename(p))
    else:
        files_sorted = sorted(files, key=lambda p: os.path.basename(p))

    # 重命名映射
    rename_map = []
    for idx, old_path in enumerate(files_sorted):
        new_basename = generate_new_name(
            old_path, args.prefix, args.start, args.digits, args.pad, args.suffix, idx
        )
        new_path = os.path.join(target_dir, new_basename)
        rename_map.append((old_path, new_path))

    # 检查新文件名冲突（多个原文件映射到相同新文件名）
    seen = set()
    for old, new in rename_map:
        if new in seen:
            print(f"冲突：多个文件将被重命名为 '{os.path.basename(new)}'", file=sys.stderr)
            sys.exit(1)
        seen.add(new)

    # 检查新文件名是否与现有文件（除了自身）冲突
    existing_files = set(get_files(target_dir, include_hidden=args.include_hidden, whitelist=None, whitelist_mode="include"))  # 检查所有文件
    for old, new in rename_map:
        if new != old and new in existing_files:
            print(f"冲突：新文件名 '{os.path.basename(new)}' 已被其他文件占用", file=sys.stderr)
            sys.exit(1)

    # 显示预览
    print("\n重命名计划：")
    print(f"目录: {target_dir}")
    print(f"前缀: '{args.prefix}'  后缀: '{args.suffix}'")
    print(f"起始数字: {args.start}  数字位数: {'自动' if not args.pad else args.digits}  {'(已补齐零)' if args.pad else '(未补零)'}")
    if whitelist:
        mode_desc = "只重命名白名单内的文件" if args.whitelist_mode == "include" else "保护白名单内的文件（不重命名）"
        print(f"扩展名白名单: {', '.join(sorted(whitelist))}  模式: {mode_desc}")
    else:
        print("扩展名白名单: 无（处理所有文件）")
    print("-" * 50)
    for old, new in rename_map:
        print(f"{os.path.basename(old)} -> {os.path.basename(new)}")
    print("-" * 50)

    if args.dry_run:
        print("预览模式，未实际重命名。")
        return

    if not args.yes:
        try:
            answer = input("确认执行以上重命名？(y/n): ").strip().lower()
            if answer not in ('y', 'yes'):
                print("已取消。")
                return
        except KeyboardInterrupt:
            print("\n已取消。")
            return

    success_count = 0
    for old, new in rename_map:
        try:
            os.rename(old, new)
            print(f"重命名: {os.path.basename(old)} -> {os.path.basename(new)}")
            success_count += 1
        except Exception as e:
            print(f"重命名失败: {os.path.basename(old)} -> {os.path.basename(new)}，错误: {e}", file=sys.stderr)

    print(f"\n完成！成功重命名 {success_count} 个文件，共 {len(rename_map)} 个。")


if __name__ == "__main__":
    main()
