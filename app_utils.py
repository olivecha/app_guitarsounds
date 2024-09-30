import os
import io
from inspect import getdoc
import numpy as np
import streamlit as st
import matplotlib.pyplot as plt
from PIL import Image
from guitarsounds.analysis import Plot, Signal, Sound, SoundPack

def load_md(md_file):
    with open(md_file) as f:
        content = f.read()
    return content

def mpl2pil(fig):
    """Convert a Matplotlib figure to a PIL Image and return it"""
    buf = io.BytesIO()
    fig.savefig(buf)
    buf.seek(0)
    img = Image.open(buf)
    return img

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
    numbers = list(session_state['cached_sounds'].keys())
    numbers = [int(num) for num in numbers]
    if len(numbers) > 0:
        return np.sort(numbers)[-1] +1 
    else:
        return 0

def remove_cached_sound(session_state, sound_key):
    """ 
    remove a sound from the cached sounds 
    """
    session_state['cached_sounds'].pop(sound_key)

def remove_log_ticks(fig):
    """
    Make the ticks in log scale plots linear so its less confusing
    """
    for ax in fig.axes:
        labels = ax.get_xticklabels()
        xmin, xmax = ax.get_xlim()
        new_labels = []
        textual_label_case = False
        for l in labels:
            try:
                _, number, exp = l.get_text().split('{')
                number = number.replace('^', "")
                exp = exp.split('}')[0]
                value = int(number) ** int(exp)
                new_labels.append(value)
            except ValueError:
                nstr = l.get_text()
                # Fancy fancy matplotlib
                nstr = nstr.replace('−', '-')
                if '.' in nstr:
                    new_labels.append(float(nstr))
                else:
                    try:
                        new_labels.append(int(nstr))
                    except ValueError:
                        textual_label_case = True
        if textual_label_case:
            ax.set_xticklabels(labels)
        else:
            new_labels = [l for l in new_labels if l > xmin]
            new_labels = [l for l in new_labels if l < xmax]
            ax.set_xticks(new_labels)
            ax.set_xticklabels(new_labels)

def remove_log_ticksY(fig):
    """
    Make the ticks in log scale plots linear so its less confusing
    """
    for ax in fig.axes:
        if ax.get_yscale() != 'linear':
            labels = ax.get_yticklabels()
            ymin, ymax = ax.get_ylim()
            new_labels = []
            textual_label_case = False
            for l in labels:
                try:
                    _, number, exp = l.get_text().split('{')
                    number = number.replace('^', "")
                    exp = exp.split('}')[0]
                    value = int(number) ** int(exp)
                    new_labels.append(value)
                except ValueError:
                    nstr = l.get_text()
                    # Fancy fancy matplotlib
                    nstr = nstr.replace('−', '-')
                    if '.' in nstr:
                        new_labels.append(float(nstr))
                    else:
                        try:
                            new_labels.append(int(nstr))
                        except ValueError:
                            textual_label_case = True
            if textual_label_case:
                ax.set_yticklabels(labels)
            else:
                new_labels = [l for l in new_labels if l > ymin]
                new_labels = [l for l in new_labels if l < ymax]
                ax.set_yticks(new_labels)
                ax.set_yticklabels(new_labels)

def create_figure(analysis, key, *args):
    """ Run a plotting fonction but include calls to streamlit """
    fig, ax   = plt.subplots(figsize=(7, 4.5))
    plt.sca(ax)
    analysis(*args)
    fig = plt.gcf()
    remove_log_ticks(fig)
    fig.savefig(os.path.join('figure_cache',key), dpi=200)


def audioseg2guitarsound(a):
    """
    Convert an AudioSegment object
    to a guitarsound.Sound
    """
    a = a.split_to_mono()[0] 
    norm_signal = np.array(a.get_array_of_samples())
    norm_signal = norm_signal / a.max_possible_amplitude
    sample_rate = a.frame_rate
    sound = Sound((norm_signal, sample_rate))
    return sound

def state_modifying_function(args=None, state=None):
    """
    Test fun
    """
    if "image" not in state:
        x = np.arange(10)
        plt.plot(x, x)
        fig = plt.gcf()
        img = mpl2pil(fig)
        state["image"] = img
    return state

def display_norm_help(expander):
    expander.markdown(load_md(os.path.join('documentation', 
                                           'normalisation1.md')))
    expander.image(Image.open(os.path.join('documentation', 
                                           'figures', 
                                           'normalisation1.jpeg')), width=500)
    expander.markdown(load_md(os.path.join('documentation', 
                                           'normalisation2.md')))
    expander.image(Image.open(os.path.join('documentation', 
                                                     'figures', 
                                                     'normalisation2.jpeg')), use_column_width=True)
