import json
import os.path
import shutil
import subprocess

# 仓库克隆缓存目录（相对脚本所在目录），加入白名单避免被清空
CACHE_DIR = ".repo_cache"


def log(msg: str):
    print(msg, flush=True)


def run(cmd: str, cwd: str = None) -> tuple[int, str]:
    """执行命令，返回 (exit_code, output)"""
    if cwd is None:
        return subprocess.getstatusoutput(cmd)
    return subprocess.getstatusoutput(f'cd "{cwd}" && {cmd}')


def get_short_name(git_url: str) -> str:
    splts = git_url.split('/')
    short_name = splts[-1]
    if short_name == 'packages' or short_name == 'packages.git':
        if len(splts) > 1:
            short_name = splts[-2] + '-' + splts[-1]
    return short_name.replace('.git', '')


def ensure_repo_cache(git_url: str, branch: str, short_name: str) -> str | None:
    """
    确保本地缓存仓库存在且是最新。
    命中缓存则增量 fetch + reset，未命中则重新克隆。
    返回缓存目录路径，失败返回 None。
    """
    os.makedirs(CACHE_DIR, exist_ok=True)
    # 不同分支用不同缓存目录，避免分支切换互相覆盖
    cache_name = f"{short_name}-{branch}" if branch else short_name
    repo_path = os.path.join(CACHE_DIR, cache_name)

    def is_valid_cache() -> bool:
        if not os.path.isdir(os.path.join(repo_path, ".git")):
            return False
        code, url = run("git config --get remote.origin.url", cwd=repo_path)
        if code != 0 or url.strip() != git_url:
            return False
        return True

    if is_valid_cache():
        log(f"命中缓存：{repo_path}，开始增量更新")
        fetch_cmd = "git fetch origin --prune"
        if branch:
            fetch_cmd += f" {branch}"
        code, msg = run(fetch_cmd, cwd=repo_path)
        if code != 0:
            log(f"fetch 失败，删除缓存重新克隆：{msg}")
            shutil.rmtree(repo_path, ignore_errors=True)
        else:
            # reset 到远端，等价 pull 且能容忍上游 force push
            target = f"origin/{branch}" if branch else "origin/HEAD"
            code, msg = run(f"git checkout {branch} 2>/dev/null; git reset --hard {target}", cwd=repo_path)
            if code == 0:
                log("增量更新成功")
                return repo_path
            log(f"reset 失败，删除缓存重新克隆：{msg}")
            shutil.rmtree(repo_path, ignore_errors=True)
    else:
        if os.path.exists(repo_path):
            log(f"缓存无效（url 不匹配或损坏），重新克隆：{repo_path}")
            shutil.rmtree(repo_path, ignore_errors=True)

    log(f"开始克隆：{git_url}")
    branch_params = f"-b {branch}" if branch else ""
    code, msg = run(f"git clone {git_url} {branch_params} {repo_path}")
    if code != 0:
        log(f"clone 失败：{msg}")
        shutil.rmtree(repo_path, ignore_errors=True)
        return None
    log("clone 成功")
    return repo_path


def copy_tree(src: str, dst: str):
    """复制文件或目录，目标已存在则先删除"""
    if os.path.isdir(dst):
        shutil.rmtree(dst)
    elif os.path.exists(dst):
        os.remove(dst)
    if os.path.isdir(src):
        shutil.copytree(src, dst)
    else:
        shutil.copy2(src, dst)


def sync_package(git_url: str, branch: str = None, paths: list[str] = None):
    """
    从git_url进行同步仓库
    :param git_url: git的url
    :param branch: git的分支，不传为默认
    :param paths: 目录下的path
    """
    log(f"开始同步仓库：{git_url}, paths: {paths}")

    short_name = get_short_name(git_url)
    log(f"仓库简称：{short_name}")

    repo_path = ensure_repo_cache(git_url, branch, short_name)
    if repo_path is None:
        return

    log("开始拷贝文件")
    if not paths:
        log(f"整仓拷贝：{repo_path} -> {short_name}")
        if os.path.exists(short_name):
            shutil.rmtree(short_name)
        # 整仓拷贝时排除 .git
        shutil.copytree(repo_path, short_name, ignore=shutil.ignore_patterns(".git"))
    else:
        if not os.path.exists(short_name):
            log(f"创建仓库目录：{short_name}")
            os.makedirs(short_name)
        for p in paths:
            src_path = os.path.join(repo_path, p)
            dest_path = os.path.join(short_name, p)
            if not os.path.exists(src_path):
                log(f"警告：源路径不存在，跳过：{src_path}")
                continue
            log(f"拷贝：{src_path} -> {dest_path}")
            copy_tree(src_path, dest_path)

    log(f"同步完成，目录内容：{os.listdir(short_name)}")
    log(f"同步插件 {git_url} 完成")


config_json = 'package_config.json'
with open(config_json, 'r') as f:
    package_config = json.load(f)

white_list = [
    "sync_packages.py",
    ".git",
    "package_config.json",
    ".gitignore",
    CACHE_DIR,
]

log("先全部清除")
files = os.listdir('.')
for f in files:
    if f in white_list:
        log(f"不删除：{f}")
        continue
    if os.path.isdir(f):
        log(f"删除文件夹：{f}")
        shutil.rmtree(f)
    else:
        log(f"删除文件：{f}")
        os.remove(f)

for key in package_config:
    value = package_config[key]
    git_url = key
    branch = value.get('branch')
    paths = value.get('paths')
    sync_package(git_url, branch=branch, paths=paths)

log('开始提交')
msg = subprocess.getoutput('git add . && git commit -m "auto sync packages" && git push')
log(msg)
