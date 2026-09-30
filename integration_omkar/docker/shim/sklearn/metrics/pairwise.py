import numpy as np


def cosine_similarity(X, Y):
    X = np.atleast_2d(np.asarray(X, dtype=np.float32))
    Y = np.atleast_2d(np.asarray(Y, dtype=np.float32))
    dot = np.dot(X, Y.T)
    norm_x = np.linalg.norm(X, axis=1, keepdims=True)
    norm_y = np.linalg.norm(Y, axis=1, keepdims=True)
    denom = np.dot(norm_x, norm_y.T)
    denom = np.where(denom == 0, 1e-10, denom)
    return dot / denom
