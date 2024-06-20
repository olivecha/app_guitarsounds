import time, os, io
from inspect import getdoc
from tempfile import NamedTemporaryFile
import streamlit as st
import numpy as np
from PIL import Image
from docx import Document
from docx.shared import Inches
import datetime
import matplotlib.pyplot as plt
import soundfile as sf
from pydub import AudioSegment
from audiorecorder import audiorecorder
from guitarsounds.utils import load_wav
from guitarsounds.analysis import Sound, Plot, SoundPack
from app_utils import get_file_number, get_cached_next_number
from app_utils import remove_cached_sound, audioseg2guitarsound
from app_utils import mpl2pil, remove_log_ticks
import defined_analyses
from defined_analyses import all_report_headers


#"""
#Interactive analysis call back functions
#"""
def create_figure3(analysis, key, *args):
    """ Create figure and updates state """
    fig, ax   = plt.subplots(figsize=(7, 4.5))
    plt.sca(ax)
    analysis(*args)
    fig = plt.gcf()
    remove_log_ticks(fig)
    image = mpl2pil(fig)
    st.session_state['cached_images'][key] = image

def create_figure2(analysis, key, *args):
    """ Run a plotting fonction but include calls to streamlit """
    fig, ax   = plt.subplots(figsize=(7, 4.5))
    plt.sca(ax)
    analysis(*args)
    fig = plt.gcf()
    remove_log_ticks(fig)
    image = mpl2pil(fig)
    return image

def generate_report(report_analyses, cached_images):
    """Génère un rapport d'analyse en format word"""
    document = Document()
    today = datetime.date.today()
    document.add_heading(f"Rapport d'analyse comparative de sons de guitare", level=0)
    document.add_heading(f'({today.day}/{today.month}/{today.year})', level=2)
    for analysis in report_analyses:
        if report_analyses[analysis]:
            document.add_paragraph(all_report_headers[analysis], style='Heading 2')
            tempFile = io.BytesIO()
            image = cached_images[analysis]
            image.save(tempFile, format="PNG")
            document.add_picture(tempFile, width=Inches(5))
        tempDoc = io.BytesIO()
        document.save(tempDoc)
        tempDoc.seek(0)
        st.session_state["report_file"] = tempDoc

def variable_signal_context(sound):
    """
    Menu for the variable time signal plot
    """
    c = st.container()
    colmin, colmax, colgo = c.columns([2, 2, 1])
    lower_bound = colmin.number_input(label="Temps min", 
                                      min_value=0.0)
    upper_bound = colmax.number_input(label="Temps max", 
                                      max_value=sound.signal.time()[-1],
                                      value=sound.signal.time()[-1])
    colgo.write(" ")
    colgo.write(" ")
    colgo.button(label="Actualiser", 
                 key='Actualiser signal',
                 on_click=create_figure3, 
                 args=(defined_analyses.variable_signal_plot, 
                       'signal', 
                        sound,
                        lower_bound,
                        upper_bound,
                        c))
    # Change the session state if there is no image
    if st.session_state['cached_images']['signal'] is None:
        fun = defined_analyses.plot_with_sound(defined_analyses.Plot.signal)
        img = create_figure2(fun,
                             'signal',
                             sound)
        st.session_state['cached_images']['signal'] = img

def variable_envelope_context(sound):
    """
    Menu for the variable time envelope plot
    """
    c = st.container()
    colmin, colmax, colgo = c.columns([2, 2, 1])
    lower_bound = colmin.number_input(label="Temps min", 
                                      key='envelope min',
                                      min_value=0.0)
    upper_bound = colmax.number_input(label="Temps max", 
                                      key='envelope max',
                                      max_value=sound.signal.time()[-1],
                                      value=sound.signal.time()[-1])
    colgo.write(" ")
    colgo.write(" ")
    colgo.button(label="Actualiser", 
                 key='Actialiser envelope',
                 on_click=create_figure3, 
                 args=(defined_analyses.variable_envelope_plot, 
                       'envelope', 
                        sound,
                        lower_bound,
                        upper_bound,
                        c))
    if st.session_state['cached_images']['envelope'] is None:
        print("Generating first envelope figure")
        fun = defined_analyses.plot_with_sound(defined_analyses.Plot.envelope)
        img = create_figure2(fun,
                             'envelope',
                             sound)
        st.session_state['cached_images']['envelope'] = img

def variable_logenv_context(sound):
    """
    Menu for the variable time log envelope plot
    """
    c = st.container()
    colmin, colmax, colgo = c.columns([2, 2, 1])
    lower_bound = colmin.number_input(label="Temps min", 
                                      key='logenv min',
                                      min_value=0.0)
    upper_bound = colmax.number_input(label="Temps max", 
                                      key='logenv max',
                                      max_value=sound.signal.time()[-1],
                                      value=sound.signal.time()[-1])
    colgo.write(" ")
    colgo.write(" ")
    colgo.button(label="Actualiser", 
                 key='Actualiser logenv',
                 on_click=create_figure3, 
                 args=(defined_analyses.variable_logenv_plot, 
                       'logenv', 
                        sound,
                        lower_bound,
                        upper_bound,
                        c))

    if st.session_state['cached_images']['logenv'] is None:
        fun = defined_analyses.plot_with_sound(defined_analyses.Plot.log_envelope)
        img = app_utils.create_figure2(fun,
                                       'logenv',
                                       sound)

def variable_fft_context(sound):
    """
    Menu for the variable time log envelope plot
    """
    c = st.container()
    colmin, colmax, colgo = c.columns([2, 2, 1])
    lower_bound = colmin.number_input(label="Fréquence min", 
                                      min_value=0)
    upper_bound = colmax.number_input(label="Fréquence max", 
                                      max_value=3000,
                                      value=2000)
    colgo.write(" ")
    colgo.write(" ")
    colgo.button(label="Actualiser", 
                 on_click=create_figure3, 
                 key='Actualiser fft',
                 args=(defined_analyses.variable_fft_plot, 
                       'fft', 
                        sound,
                        lower_bound,
                        upper_bound,
                        c))

    if st.session_state['cached_images']['fft'] is None:
        fun = defined_analyses.plot_with_sound(defined_analyses.Plot.fft)
        img = create_figure2(fun,
                             'fft',
                             sound)
        st.session_state['cached_images']['fft'] = img

# """
# Update the defined analyses with the locally defined functions
# """
defined_analyses.single_sound_analysis_functions['signal'] = variable_signal_context
defined_analyses.single_sound_analysis_functions['envelope'] = variable_envelope_context
defined_analyses.single_sound_analysis_functions['logenv'] = variable_logenv_context
defined_analyses.single_sound_analysis_functions['fft'] = variable_fft_context

# """ 
# Session setup
# """

if "report_file" not in st.session_state:
    st.session_state["report_file"] = None

# Flag to not upload the sound for every run
if 'upload_status' not in st.session_state:
    st.session_state['upload_status'] = None

# Cache containing all the loaded sounds
if 'sounds_cache' not in st.session_state:
    st.session_state['sounds_cache'] = {}

# Flag for the analysis output
if 'analysis_output' not in st.session_state:
    st.session_state['analysis_output'] = {}

if 'reference_recording' not in st.session_state:
    st.session_state['reference_recording'] = ''

if 'cached_logo' not in st.session_state:
    image = Image.open('documentation/figures/logo.png')
    st.session_state['cached_logo'] = image


# Functions modifying the session state 
# Need to be defined in this file
def update_file_load_status():
    """ function for upload button call_back """
    st.session_state['upload_status'] = True

def reset_analyses(analysis_names):
    st.session_state['analysis_menu'] = {name:None for name in analysis_names}
    st.session_state['report_analyses'] = {name:False for name in analysis_names}
    st.session_state['cached_images'] = {name:None for name in analysis_names}

def set_state(menu, analysis, state):
    """ set the session state of a menu to organise outputs """
    st.session_state[menu][analysis] = state 


def generate_figure_and_set_state(analysis_call, key, sound):
    """
    Function to alter the session state depending on the analysis call
    """
    # Case for the listen frequency bins function
    if key == 'listenband':
        set_state('analysis_menu', key, 'listen')
    # Case for interactive analyses
    elif key in ['signal', 'envelope', 'logenv', 'fft']:
        set_state('analysis_menu', key, 'call')
    # Default
    else:
        image = create_figure2(analysis_call, key, sound) 
        st.session_state['cached_images'][key] = image
        set_state('analysis_menu', key, 'figure')

# Title and logo
title = "Analyse comparative de sons de guitare (V 2.0)"
col_logo, col_title = st.columns([1, 2])
with col_title:
    st.title(title)
with col_logo:
    st.write('')
    st.write('')
    st.image(st.session_state['cached_logo'], use_column_width='always')

sounds_io, analysis, help_tab, about = st.tabs(["Ajouter des sons", 
                                                "Analyser/Comparer des sons",
                                                "Aide",
                                                "À Propos"])

# First tab (Input / Output)
with sounds_io: 
    col1, col2 = st.columns([1, 1])
    col1.write('')
    col2.write('')

    # Audio recording sound loading
    expander1 = col1.expander("Enregistrer un son")
    with expander1:
        now = time.time()
        audio_seg = audiorecorder("Cliquez pour débuter l'enregistrement", "Stop")
        recording_time  = time.time() - now

    if (st.session_state['reference_recording'] != audio_seg.raw_data and 
        len(audio_seg) > 0):
        new_sound = audioseg2guitarsound(audio_seg)
        sound_number = get_cached_next_number(st.session_state)
        st.session_state['sounds_cache'][sound_number] = new_sound
        st.session_state['reference_recording'] = audio_seg.raw_data
        st.warning(("Les sons enregistrés ne sont pas sauvegardés d'une session à l'autre \n"
                    "vous pouvez les télécharger si vous voulez les conserver"), icon="⚠️")
    
    # File uploading
    expander = col2.expander("Téléverser un son")
    uploaded_file = expander.file_uploader("Choose a file", 
                                           on_change=update_file_load_status,
                                           label_visibility='collapsed')
    
    if uploaded_file is not None and st.session_state['upload_status']:
        if uploaded_file.name.split('.')[-1] != 'wav':
            # Use AudioSegment for non WAV files
            ext = uploaded_file.name.split('.')[-1]
            audio_seg = AudioSegment.from_file(uploaded_file, ext)
            new_sound = audioseg2guitarsound(audio_seg)
        else:
            sigarray, sr = sf.read(uploaded_file)
            new_sound = Sound((sigarray, sr))
        sound_number = get_cached_next_number(st.session_state)
        st.session_state['sounds_cache'][sound_number] = new_sound
        st.session_state['upload_status'] = False
    
    # Display the list of loaded sounds
    col3, col4, col5, colx = st.columns([2, 2.5, 0.5, 0.5])
    names = []
    for sound_number in st.session_state['sounds_cache']:
        sound = st.session_state['sounds_cache'][sound_number]
        colx.write(' ')
        colx.button(label=':wastebasket:', 
                    key=f'del_{sound_number}',
                    on_click=remove_cached_sound,
                    args=(st.session_state, sound_number))
        col3.write(' ')
        col4.write(' ')
        name = col3.text_input(f'name_{sound_number}', 
                               'Nom du son', 
                               label_visibility='collapsed')
        names.append(name)
        col4.audio(sound.signal.signal, sample_rate=sound.signal.sr)
        col5.write(' ')

        if name != 'Nom du son':
            download_name = f"{name}.wav"
        else:
            download_name = f"Son_{sound_number}.wav"

        col5.download_button(label=':arrow_down:',
                             data=sound.file_bytes,
                             key=f"download_{sound_number}",
                             file_name=f'{name}.wav',)

    # If more than one sound create soundpack item
    if len(st.session_state['sounds_cache']) > 1:
        st.session_state['soundpack'] = None

# Analysis Tab
with analysis:
    # Define the number of sounds item
    if 'number_of_sounds' not in st.session_state:
        st.session_state['number_of_sounds'] = 0
    if 'current_sounds' not in st.session_state:
        st.session_state['current_sounds'] = [np.zeros(10)]
    # columns to format the output
    colbut, colhelp, colcheck = st.columns([3.5, 0.5, 1.0])
    # Get the dictionnary containing all the uploaded sounds
    sound_cache = st.session_state['sounds_cache']
    # Get all the sounds in a list
    sounds_list = [sound_cache[name] for name in sound_cache]
    # if the soundpack key exists, define a soundpack
    if 'soundpack' in st.session_state:
        if st.session_state['soundpack'] is None:
            st.session_state['soundpack'] = SoundPack(sounds_list, names=names)

    if len(sounds_list) > 0:
        # Write the headers
        colbut.write('Analyse')
        colhelp.write('Aide')
        colcheck.write('Rapport')

        # Load the analyses when looking only at a single sound
        if len(sounds_list) == 1:
            # {analysis keys: name strings}
            analysis_names = defined_analyses.single_sound_analysis_names
            # {analysis keys: callables on the sounds}
            analysis_functions = defined_analyses.single_sound_analysis_functions
            # {analysis keys: loaded markdown help file}
            analysis_helps = defined_analyses.single_sound_analysis_help
            # {analysis keys: loaded help figure}
            analysis_figures = defined_analyses.single_sound_analysis_help_figures

        # Load the analyses to compare two sounds
        elif len(sounds_list) == 2:
            analysis_names = defined_analyses.dual_sound_analysis_names
            analysis_functions = defined_analyses.dual_sound_analysis_functions
            analysis_helps = defined_analyses.dual_sound_analysis_help
            analysis_figures = defined_analyses.dual_sound_analysis_help_figures

        # Load the analyses to compare an arbitrary amount of sounds
        elif len(sounds_list) > 2:
            analysis_names = defined_analyses.multi_sound_analysis_names
            analysis_functions = defined_analyses.multi_sound_analysis_functions
            analysis_helps = defined_analyses.multi_sound_analysis_help
            analysis_figures = defined_analyses.multi_sound_analysis_help_figures

        # Session state data for the analyses
        # Define the analysis menu in the session state
        if 'analysis_menu' not in st.session_state:
            # Only occurs when the first sound is loaded
            reset_analyses(analysis_names)
            st.session_state['number_of_sounds'] = len(sounds_list)

        # Update if the number of sounds has changed
        elif len(sounds_list) != st.session_state['number_of_sounds']:
            # TODO: Add some logging
            print((f'The number of sounds changed from {st.session_state["number_of_sounds"]}'
                   f' to {len(sounds_list)}'))
            reset_analyses(analysis_names)
            # Update the stored number of sounds
            st.session_state['number_of_sounds'] = len(st.session_state['sounds_cache'])

        # Update if the number of sounds is the same but they changed
        else:
            sounds_were_changed = False
            new_signals = [sound.signal.signal for sound in sounds_list]
            for previous_signal, new_signal in zip(st.session_state['current_sounds'], new_signals):
                if len(previous_signal) != len(new_signal):
                    sounds_were_changed = True
                    break
                elif (previous_signal != new_signal).any():
                    sounds_were_changed = True
                    break
            if sounds_were_changed:
                print('The number of sounds is the same but they changed so the analyses were restarted')
                reset_analyses(analysis_names)
                st.session_state['current_sounds'] = [s.signal.signal for s in sounds_list]

        for analysis in analysis_names:
            colbut, colhelp, colcheck = st.columns([3.5, 0.5, 1.0])

            if len(sounds_list) == 1:
                colbut.button(label=analysis_names[analysis],
                              on_click=generate_figure_and_set_state,
                              use_container_width=True,
                              args=(analysis_functions[analysis], 
                                    analysis, 
                                    sounds_list[0]))
            else:
                pack = st.session_state['soundpack']
                colbut.button(label=analysis_names[analysis],
                              on_click=generate_figure_and_set_state,
                              use_container_width=True,
                              args=(analysis_functions[analysis], 
                                    analysis, 
                                    pack))


            colhelp.button(label=':question:',
                           key=analysis,
                           on_click=set_state,
                           args=('analysis_menu', analysis, 'help'))

            if analysis != 'listenband':
                show_check = True
                check_value = False
                if st.session_state['analysis_menu'][analysis] in ('figure', 'call'):
                    check_value = True
                else:
                    show_check = False

                if show_check:
                    check = colcheck.checkbox(label=analysis,
                                              value=check_value, 
                                              label_visibility='collapsed')
                    st.session_state['report_analyses'][analysis] = check
                else:
                    colcheck.write('')
                    st.session_state['report_analyses'][analysis] = False
                    
            else:
                colcheck.write('')
                st.session_state['report_analyses'][analysis] = False

            # Get the image produced by matplotlib and display it
            if st.session_state['analysis_menu'][analysis] == 'figure':
                image = st.session_state['cached_images'][analysis]
                st.empty().image(image)

            # Special case for interactive analyses where the function
            # is called on each loop to update the figure
            elif st.session_state['analysis_menu'][analysis] == 'call':
                image = analysis_functions[analysis](sounds_list[0])
                image = st.session_state['cached_images'][analysis]
                st.empty().image(image)
            
            elif st.session_state['analysis_menu'][analysis] == 'listen':
                analysis_functions[analysis](sounds_list[0])

            elif st.session_state['analysis_menu'][analysis] == 'help':
                helpstr = analysis_helps[analysis]
                st.empty().markdown(helpstr)
                st.empty().image(analysis_figures[analysis], use_column_width=True)

        colrestart, colrep, coldown = st.columns(3)

        colrestart.button(label='Réinitialiser les analyses',
                          on_click=reset_analyses,
                          args=(analysis_names, ))

        if colrep.button(label='Générer un rapport',
                         on_click=generate_report,
                         args=(st.session_state['report_analyses'],
                               st.session_state['cached_images'])):

            coldown.download_button(label='Télécharger le rapport',
                                    data=st.session_state['report_file'].read(),
                                    file_name='report.docx')

    else:
        try:
            _ = analysis_names
        except:
            analysis_names = defined_analyses.single_sound_analysis_names
        reset_analyses(analysis_names)
        st.write('Veuillez sélectioner un son')

with help_tab:
    with open(os.path.join('documentation', 'documentation.md')) as md_file:
        md_string = md_file.read()
    st.markdown(md_string)

with about:
    with open(os.path.join('documentation', 'about.md')) as abt_file:
        md_string = abt_file.read()
    st.markdown(md_string)
    

