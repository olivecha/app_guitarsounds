import os
from inspect import getdoc
import numpy as np
from docx import Document
from docx.shared import Inches
import streamlit as st
import matplotlib.pyplot as plt
from PIL import Image
from guitarsounds.analysis import Plot, Signal, Sound, SoundPack
from defined_analyses import all_report_headers

def get_file_number(filename):
    """ get the number in a filename """
    numbers = []
    for char in filename:
        try:
            numbers.append(int(char))
        except:
            pass 
    numbers = [str(num) for num in numbers]
    return int(''.join(numbers))

def get_temp_sound_number():
    """ 
    Get the current temp sound number 
    """
    numbers = []
    for filename in os.listdir('temp_sounds'):
        numbers.append(get_file_number(filename))

    if len(numbers) == 0:
        return 0
    else:
        return np.sort(numbers)[-1] + 1

def get_cached_next_number(session_state):
    """ 
    Find the next sound key to cache 
    """
    numbers = list(session_state['sounds_cache'].keys())
    numbers = [int(num) for num in numbers]
    if len(numbers) > 0:
        return np.sort(numbers)[-1] +1 
    else:
        return 0

def remove_cached_sound(session_state, sound_key):
    """ 
    remove a sound from the cached sounds 
    """
    session_state['sounds_cache'].pop(sound_key)


def create_figure(analysis, key, *args):
    """ Run a plotting fonction but include calls to streamlit """
    fig, ax   = plt.subplots(figsize=(10, 6))
    plt.sca(ax)
    analysis(*args)
    plt.gcf().savefig(os.path.join('figure_cache',key))

def generate_report(report_analyses):
    """Génère un rapport d'analyse en format word"""
    document = Document()
    document.add_heading('Rapport guitarsounds',level=1)
    for analysis in report_analyses:
        if report_analyses[analysis]:
            document.add_heading(all_report_headers[analysis], level=2)
            document.add_picture(f'figure_cache/{analysis}.png',width=Inches(5))
    document.save('report.docx')



