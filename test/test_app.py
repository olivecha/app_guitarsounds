import unittest
from streamlit.testing.v1 import AppTest


class TestApp(unittest.TestCase):

    def test_app_can_run(self):
        """
        This only test whether an exception is raised when running the app
        """
        at = AppTest.from_file('../app.py').run()
        self.assertTrue(not at.exception)

