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
        print(f'需要重命名{clone_path}为{name}')
        os.rename(clone_path, name)
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
        'path': 'luci'
    },
    'luci-app-wolplus': {
        'git_url': 'https://github.com/animegasan/luci-app-wolplus.git'
    }
}

for key in package_config:
    value = package_config[key]
    git_url = value['git_url']
    branch = value.get('branch')
    path = value.get('path')
    sync_package(key, git_url, branch=branch, path=path)

print('开始提交')
msg = subprocess.getoutput('git add . && git commit -m "auto sync packages" && git push')
print(msg)
