import json
import os.path
import shutil
import subprocess


def sync_package(name: str, git_url: str, branch: str = None, path: str = None):
    """
    从git_url进行同步仓库
    :param name: 插件名称
    :param git_url: git的url
    :param branch: git的分支，不传为默认
    :param path: 目录下的path
    """

    print(f"开始同步插件：{name}, git_url: {git_url}")

    if os.path.exists(name):
        print(f"旧的{name}已存在，先删除")
        shutil.rmtree(name)

    branch_params = ""
    if branch:
        branch_params = f'-b {branch}'

    clone_path = 'temp-clone'
    if os.path.exists(clone_path):
        print('临时目录存在，先删除')
        shutil.rmtree(clone_path)

    print("开始clone")
    code, msg = subprocess.getstatusoutput(f'git clone {git_url} {branch_params} {clone_path}')
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

    if path:
        dest_path = f"{clone_path}/{path}"
    else:
        dest_path = clone_path

    is_root = False
    for f in os.listdir(dest_path):
        if f == 'Makefile':
            is_root = True
            print('当前目录是插件的根目录')
            break

    if is_root:
        luci_root = 'luci'
        if not os.path.exists(luci_root):
            os.mkdir(luci_root)
        print(f'需要移动{dest_path}到{luci_root}')
        subprocess.getoutput(f'mv {dest_path} {luci_root}/{name}')
    else:
        print(f"需要拷贝{dest_path}下的所有到当前")
        subprocess.getoutput(f'cp -rf "{dest_path}"/* .')
        print('删除临时目录')
        shutil.rmtree(clone_path)

    print(f"同步插件{name}完成")


# print('开始拉取新代码')
# subprocess.getoutput('git reset --hard && git pull')

package_config = {
    'luci-app-store': {
        'git_url': 'https://github.com/linkease/istore.git',
    },
    'luci-app-wolplus': {
        'git_url': 'https://github.com/animegasan/luci-app-wolplus.git'
    },
    "luci-app-qmodem": {
        'git_url': 'https://github.com/FUjr/QModem.git'
    },
    "luci-app-turboacc": {
        'git_url': 'https://github.com/chenmozhijin/turboacc.git'
    },
    "luci-app-gecoosac": { # 集客ac控制器
        'git_url': 'https://github.com/lwb1978/openwrt-gecoosac.git'
    },
    "luci-app-lucky": {
     'git_url': 'https://github.com/gdy666/luci-app-lucky.git'
    },
    "luci-app-easytier": {
     'git_url': 'https://github.com/EasyTier/luci-app-easytier.git'
    },
}

print("先全部清除")
files = os.listdir('.')
for f in files:
    if f == 'sync_packages.py' or f == '.git':
        print(f"不删除：{f}")
        continue
    if os.path.isdir(f):
        print(f"删除文件夹：{f}")
        shutil.rmtree(f)
    else:
        print(f"删除文件：{f}")
        os.remove(f)

other = subprocess.getoutput('echo $other_packages')
if other:
    print(f"输入了其他配置：{other}")
    other_dict = json.loads(other)
    package_config.update(other_dict)

for key in package_config:
    value = package_config[key]
    git_url = value['git_url']
    branch = value.get('branch')
    path = value.get('path')
    sync_package(key, git_url, branch=branch, path=path)

print('开始提交')
msg = subprocess.getoutput('git add . && git commit -m "auto sync packages" && git push')
print(msg)
