"""
Setuptools configuration for Pubs Warehouse.

This setup script requires that static assets have been built into the
`assets/dist` directory prior to the build.
"""

import os
from setuptools import setup, find_packages


def read_requirements():
    """
    Get application requirements from
    the requirements.txt file.
    :return: portal_ui Python requirements
    :rtype: list
    """
    with open('requirements.txt', 'r') as req:
        requirements = req.readlines()
    install_requires = [r.strip() for r in requirements if r.find('git+') != 0]
    dependency_links = [r.strip() for r in requirements if r.find('git+') == 0]
    return {'install_requires': install_requires, 'dependency_links': dependency_links}


def read(filepath):
    """
    Read the contents from a file.
    :param str filepath: path to the file to be read
    :return: file contents
    :rtype: str
    """
    with open(filepath, 'r') as file:
        content = file.read()
    return content


def identify_data_files(data_dirs, exclusions=('.gitignore', '.webassets-cache')):
    """
    Recursively introspect the contents of a directory. Once the contents
    have been introspected, generate a list directories and sub-directories
    with their contents as lists.
    Any files listed in exclusions will not be included
    as a data file. Please note that the list generated by this function
    will override any exclusions defined in MANIFEST.in. This
    means that if one specifies a file to be excluded in MANIFEST.in,
    but this function includes that file as a data file, then it's
    going to be in the distributable.

    :param list data_dirs: list of tuples each of the form: (`installation directory`, `source directory`)
        the installation directory can be None to preserve the source directory's structure in the wheel's data
        directory
    :param tuple exclusions: tuple of all the files or directories NOT to include as a data file
    :return: all contents of the directories as a list of tuples
    :rtype: list

    """
    directory_data_files = []
    for installation_directory, directory_name in data_dirs:
        for root, _, files in os.walk(directory_name, followlinks=True):
            pathnames = [
                os.path.relpath(os.path.join(root, filename))
                for filename in files
                if not any(ex in os.path.join(root, filename)
                           for ex in exclusions)
            ]
            if pathnames:
                data_install_path = (
                    installation_directory if installation_directory else os.path.relpath(root).strip('../')
                )
                data_file_element = (data_install_path, pathnames)
                directory_data_files.append(data_file_element)
    return directory_data_files


PARSED_REQUIREMENTS = read_requirements()

setup(
    name='usgs_flask_pubs_ui',
    version='2.23.0dev',
    description='USGS Publications Warehouse User Interface',
    long_description=read('../README.md'),
    author='Mary Bucknell, James Kreft, Andrew Yan',
    author_email='mbucknell@usgs.gov, jkreft@usgs.gov, ayan@usgs.gov',
    url='https://github.com/USGS-CIDA/PubsWarehouse_UI',
    classifiers=[
        'Environment :: Web Environment',
        'Framework :: Flask',
        'License :: Public Domain',
        'Programming Language :: Python :: 3.6'
    ],
    packages=find_packages(),
    include_package_data=True,
    install_requires=PARSED_REQUIREMENTS['install_requires'],
    test_suite='nose.collector',
    tests_require=PARSED_REQUIREMENTS['install_requires'],
    zip_safe=False,
    # include the tier agnostic configuration file in the distributable
    # the file gets placed in site-packages upon dist installation
    py_modules=['config'],
    # include static files in the distributable
    # they will appear in the root of the virtualenv upon dist installation
    data_files=identify_data_files([
        (None, 'static')
    ])
)
