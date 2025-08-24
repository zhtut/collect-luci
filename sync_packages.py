import json
import os.path
import shutil
import subprocess

def log(msg: str):
    print(msg, flush=True)


def sync_package(git_url: str, branch: str = None, paths: list[str] = None):
    """
    从git_url进行同步仓库
    :param git_url: git的url
    :param branch: git的分支，不传为默认
    :param path: 目录下的path
    """

    log(f"开始同步仓库：{git_url}, paths: {paths}")

    branch_params = ""
    if branch:
        branch_params = f'-b {branch}'

    splts = git_url.split('/')
    short_name = splts[-1]
    if short_name == 'packages' or short_name == 'packages.git':
        if len(splts) > 1:
            short_name = splts[-2] + '-' + splts[-1]
    short_name = short_name.replace('.git', '')
    log(f"仓库简称：{short_name}")

    clone_path = "temp-clone"
    if os.path.exists(clone_path):
        shutil.rmtree(clone_path)

    log("开始clone")
    code, msg = subprocess.getstatusoutput(f'git clone {git_url} {branch_params} {clone_path} --depth=1')
    if code == 0:
        log("clone成功")
    else:
        log(f'clone失败：{msg}')
        return

    log('删除.git文件夹')
    git_path = f'{clone_path}/.git'
    if os.path.exists(git_path):
        shutil.rmtree(git_path)

    log("开始拷贝文件")
    if not paths:
        log(f"重命名：{clone_path}至：{short_name}")
        subprocess.getoutput(f'mv {clone_path} {short_name}')
    else:
        if not os.path.exists(short_name):
            log(f"创建仓库目录：{short_name}")
            os.mkdir(short_name)
        for p in paths:
            p_path = f"{clone_path}/{p}"
            dest_path = f"{short_name}/{p}"
            log(f"重命名：{p_path}至：{dest_path}")
            subprocess.getoutput(f'mv {p_path} {dest_path}')

    log(f"同步完成，完成后的目录下有：{os.listdir(short_name)}")
    if os.path.exists(clone_path):
        log("删除临时clone")
        shutil.rmtree(clone_path)

    log(f"同步插件{git_url}完成")


# log('开始拉取新代码')
# subprocess.getoutput('git reset --hard && git pull')

config_json = 'package_config.json'
with open(config_json, 'r') as f:
    package_config = json.load(f)

white_list = [
    "sync_packages.py",
    ".git",
    "package_config.json",
    ".gitignore",
    "rem"
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
