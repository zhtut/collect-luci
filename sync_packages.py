import json
import os.path
import shutil
import subprocess


def sync_package(git_url: str, branch: str = None, paths: list[str] = None):
    """
    从git_url进行同步仓库
    :param git_url: git的url
    :param branch: git的分支，不传为默认
    :param path: 目录下的path
    """

    print(f"开始同步仓库：{git_url}, paths: {paths}")

    branch_params = ""
    if branch:
        branch_params = f'-b {branch}'

    short_name = git_url[git_url.rfind('/') + 1:]
    short_name = short_name.replace('.git', '')
    clone_path = "temp-clone"
    if os.path.exists(clone_path):
        shutil.rmtree(clone_path)

    print("开始clone")
    code, msg = subprocess.getstatusoutput(f'git clone {git_url} {branch_params} {clone_path} --depth=1')
    if code == 0:
        print("clone成功")
        print(f"文件夹下有{subprocess.getoutput(f'ls {clone_path}')}")
    else:
        print(f'clone失败：{msg}')
        return

    print('删除.git文件夹')
    git_path = f'{clone_path}/.git'
    if os.path.exists(git_path):
        shutil.rmtree(git_path)

    print("开始拷贝文件")
    if not paths:
        print(f"重命名：{clone_path}至：{short_name}")
        subprocess.getoutput(f'mv {clone_path} {short_name}')
    else:
        if not short_name:
            os.mkdir(short_name)
        for p in paths:
            p_path = f"{clone_path}/{p}"
            dest_path = f"{short_name}/{p}"
            print(f"重命名：{p_path}至：{dest_path}")
            subprocess.getoutput(f'mv {p_path} {dest_path}')

    if os.path.exists(clone_path):
        print("删除临时clone")
        shutil.rmtree(clone_path)

    print(f"同步插件{git_url}完成")


# print('开始拉取新代码')
# subprocess.getoutput('git reset --hard && git pull')

config_json = 'package_config.json'
with open(config_json, 'r') as f:
    package_config = json.load(f)

print("先全部清除")
files = os.listdir('.')
for f in files:
    if f == 'sync_packages.py' or f == '.git' or f == config_json:
        print(f"不删除：{f}")
        continue
    if os.path.isdir(f):
        print(f"删除文件夹：{f}")
        shutil.rmtree(f)
    else:
        print(f"删除文件：{f}")
        os.remove(f)

for key in package_config:
    value = package_config[key]
    git_url = key
    branch = value.get('branch')
    paths = value.get('paths')
    sync_package(git_url, branch=branch, paths=paths)

print('开始提交')
msg = subprocess.getoutput('git add . && git commit -m "auto sync packages" && git push')
print(msg)
