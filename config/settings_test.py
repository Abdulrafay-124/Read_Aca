from .settings import *

CELERY_TASK_ALWAYS_EAGER = True   # .delay() runs synchronously in tests, no real worker needed
CELERY_TASK_EAGER_PROPAGATES = True