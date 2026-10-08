SKILLS = {
    "programming": [
        "python",
        "java",
        "c",
        "c++",
        "javascript",
    ],

    "web": [
        "html",
        "css",
        "react",
        "node.js",
        "fastapi",
    ],

    "database": [
        "sql",
        "mysql",
        "mongodb",
    ],

    "data": [
        "pandas",
        "numpy",
        "machine learning",
        "deep learning",
        "data science",
    ],

    "tools": [
        "git",
        "github",
        "docker",
        "linux",
    ],

    "electronics": [
        "embedded systems",
        "microcontroller",
        "arduino",
        "verilog",
        "vlsi",
        "digital electronics",
        "matlab",
    ],

    "cloud": [
        "aws",
        "azure",
        "cloud computing",
    ],
}


def get_all_skills():
    """Return all skills as a single list."""
    return [
        skill
        for category in SKILLS.values()
        for skill in category
    ]